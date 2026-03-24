const express = require('express');
const fetch   = require('node-fetch');
const path    = require('path');

const app  = express();
const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, 'public')));

// ── Yahoo Finance proxy ──────────────────────────────────────
// Node has no CORS restrictions, so we fetch Yahoo directly and relay to browser.
const YF_MODULES = [
  'summaryProfile', 'summaryDetail', 'defaultKeyStatistics',
  'financialData',  'incomeStatementHistory', 'balanceSheetHistory',
  'cashflowStatementHistory', 'earnings', 'price'
].join(',');

const YF_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'application/json,text/html,*/*',
  'Accept-Language': 'en-US,en;q=0.9',
  'Referer': 'https://finance.yahoo.com/',
  'Origin':  'https://finance.yahoo.com'
};

async function fetchYF(symbol) {
  const hosts = ['query1.finance.yahoo.com', 'query2.finance.yahoo.com'];
  for (const host of hosts) {
    const url = `https://${host}/v10/finance/quoteSummary/${symbol}?modules=${YF_MODULES}&corsDomain=finance.yahoo.com&formatted=false`;
    try {
      const res  = await fetch(url, { headers: YF_HEADERS, timeout: 15000 });
      const json = await res.json();
      if (json?.quoteSummary?.result?.[0]) return json.quoteSummary.result[0];
      if (json?.quoteSummary?.error)       throw new Error(json.quoteSummary.error.description);
    } catch (e) {
      if (host === hosts[hosts.length - 1]) throw e;
    }
  }
}

app.get('/api/stock/:ticker', async (req, res) => {
  const raw    = req.params.ticker.toUpperCase().trim();
  const market = (req.query.market || 'auto').toLowerCase();

  // Build candidate symbols to try
  const candidates = [];
  if (raw.includes('.'))       candidates.push(raw);           // already has suffix
  else if (market === 'india') candidates.push(raw+'.NS', raw+'.BO', raw);
  else if (market === 'us')    candidates.push(raw);
  else                          candidates.push(raw, raw+'.NS', raw+'.BO'); // auto

  let data = null, usedSymbol = raw;
  for (const sym of candidates) {
    try {
      data = await fetchYF(sym);
      usedSymbol = sym;
      break;
    } catch (e) { /* try next */ }
  }

  if (!data) {
    return res.status(404).json({ error: `Could not find "${raw}". Check the ticker spelling.` });
  }

  // ── Parse & normalise ──────────────────────────────────────
  const isIndia = usedSymbol.endsWith('.NS') || usedSymbol.endsWith('.BO') || market === 'india';

  const sp  = data.summaryProfile       || {};
  const sd  = data.summaryDetail        || {};
  const ks  = data.defaultKeyStatistics || {};
  const fd  = data.financialData        || {};
  const pr  = data.price                || {};
  const isl = data.incomeStatementHistory?.incomeStatementHistory || [];
  const bsl = data.balanceSheetHistory?.balanceSheetHistory       || [];
  const cfl = data.cashflowStatementHistory?.cashflowStatementHistory || [];

  const g = (o, k) => (typeof o[k] === 'object' ? o[k]?.raw : o[k]) ?? 0;

  // Convert raw rupees → Crores OR raw dollars → Millions
  const toUnit = isIndia ? v => Math.round(v / 1e7) / 100   // paise → Cr with 2dp
                         : v => Math.round(v / 1e6) / 100;  // $ → $M with 2dp

  const iY = (i) => isl[i] || {};
  const bY = (i) => bsl[i] || {};
  const cY = (i) => cfl[i] || {};

  // Revenue & profit for 3-year CAGR
  const revNow  = g(iY(0),'totalRevenue');
  const rev2Y   = g(iY(2),'totalRevenue');
  const patNow  = g(iY(0),'netIncome');
  const pat2Y   = g(iY(2),'netIncome');
  const revCagr = (revNow > 0 && rev2Y > 0) ? +((Math.pow(revNow/rev2Y, 0.5)-1)*100).toFixed(1) : 0;
  const patCagr = (patNow > 0 && pat2Y > 0) ? +((Math.pow(patNow/pat2Y, 0.5)-1)*100).toFixed(1) : 0;

  const ebitdaRaw = g(fd,'ebitda');
  const revenueRaw= g(iY(0),'totalRevenue');
  const patRaw    = g(iY(0),'netIncome');
  const cfoRaw    = g(cY(0),'totalCashFromOperatingActivities');
  const debtRaw   = g(bY(0),'longTermDebt') || g(bY(0),'totalDebt') || 0;
  const equityRaw = g(bY(0),'totalStockholderEquity') || 1;
  const intRaw    = Math.abs(g(iY(0),'interestExpense') || 0);

  const mcRaw = g(sd,'marketCap') || g(ks,'marketCap') || 0;
  const price = g(pr,'regularMarketPrice') || g(sd,'previousClose') || 0;

  const roe  = +((g(fd,'returnOnEquity') || 0) * 100).toFixed(1);
  const roa  = +((g(fd,'returnOnAssets') || 0) * 100).toFixed(1);
  const roce = +(roa * 1.5).toFixed(1);  // approximation: ROCE ≈ ROA × 1.5

  const pe        = +(g(sd,'trailingPE') || g(ks,'trailingPE') || 0).toFixed(1);
  const pb        = +(g(ks,'priceToBook') || 0).toFixed(2);
  const divYield  = +((g(sd,'dividendYield') || 0) * 100).toFixed(2);
  const insiderPct= +((g(ks,'heldPercentInsiders') || 0) * 100).toFixed(1);
  const instPct   = +((g(ks,'heldPercentInstitutions') || 0) * 100).toFixed(1);
  const shortPct  = +((g(ks,'shortPercentOfFloat') || 0) * 100).toFixed(1);
  const beta      = +(g(sd,'beta') || g(ks,'beta') || 1).toFixed(2);
  const fiftyTwoH = +(g(sd,'fiftyTwoWeekHigh') || 0).toFixed(2);
  const fiftyTwoL = +(g(sd,'fiftyTwoWeekLow')  || 0).toFixed(2);

  // EPS & EPS growth
  const epsTrail  = +(g(ks,'trailingEps') || 0).toFixed(2);
  const epsFor    = +(g(ks,'forwardEps')  || 0).toFixed(2);
  const pegRatio  = +(g(ks,'pegRatio')    || 0).toFixed(2);

  // Revenue growth from YF financialData
  const revGrowthYF  = +((g(fd,'revenueGrowth')  || 0)*100).toFixed(1);
  const earGrowthYF  = +((g(fd,'earningsGrowth') || 0)*100).toFixed(1);
  const grossMgn     = +((g(fd,'grossMargins')    || 0)*100).toFixed(1);
  const opMgn        = +((g(fd,'operatingMargins')|| 0)*100).toFixed(1);
  const netMgn       = +((g(fd,'profitMargins')   || 0)*100).toFixed(1);
  const freeCash     = toUnit(g(fd,'freeCashflow') || 0);
  const opCash       = toUnit(g(fd,'operatingCashflow') || cfoRaw);
  const currentRatio = +(g(fd,'currentRatio') || 0).toFixed(2);
  const quickRatio   = +(g(fd,'quickRatio')   || 0).toFixed(2);
  const debtToEq     = +(g(fd,'debtToEquity') || (equityRaw>0 ? debtRaw/equityRaw : 0)).toFixed(2);
  const intCover     = +(intRaw>0 ? (ebitdaRaw/intRaw) : 99).toFixed(1);

  const sector   = sp.sector   || sp.industry || '';
  const industry = sp.industry || '';
  const country  = sp.country  || '';
  const website  = sp.website  || '';
  const summary  = sp.longBusinessSummary || '';
  const name     = pr.longName || pr.shortName || sp.longName || raw;
  const exchange = pr.exchangeName || pr.exchange || (isIndia ? 'NSE' : 'NASDAQ');

  // Analyst data
  const targetHigh = +(g(fd,'targetHighPrice') || 0).toFixed(2);
  const targetLow  = +(g(fd,'targetLowPrice')  || 0).toFixed(2);
  const targetMean = +(g(fd,'targetMeanPrice') || 0).toFixed(2);
  const recMean    = +(g(fd,'recommendationMean') || 0).toFixed(2);
  const recKey     = fd.recommendationKey || '';
  const analystCount = g(fd,'numberOfAnalystOpinions') || 0;

  res.json({
    ok: true,
    symbol: usedSymbol,
    market: isIndia ? 'India' : 'US',
    currency: isIndia ? '₹' : '$',
    unit: isIndia ? 'Cr' : 'M',

    // Identity
    name, sector, industry, country, exchange, website,
    summary: summary.slice(0, 500),

    // Price
    price,
    marketCap:    +(isIndia ? mcRaw/1e7 : mcRaw/1e6).toFixed(0),
    fiftyTwoH, fiftyTwoL, beta,

    // Income
    revenue:  toUnit(revenueRaw),
    pat:      toUnit(patNow),
    ebitda:   toUnit(ebitdaRaw || patNow * 1.5),
    interest: toUnit(intRaw),

    // Growth
    revGrowth3: revCagr || revGrowthYF,
    profitGrowth3: patCagr || earGrowthYF,

    // Margins
    grossMargin: grossMgn,
    opMargin:    opMgn,
    netMargin:   netMgn,

    // Cash flow
    cfo:       opCash,
    fcf:       freeCash,
    cfoPATRatio: +(patNow > 0 && cfoRaw ? cfoRaw/patNow : 0).toFixed(2),

    // Balance sheet
    debt:     toUnit(debtRaw),
    equity:   toUnit(equityRaw),
    debtEquity: debtToEq,
    currentRatio, quickRatio,

    // Returns
    roce, roe, roa,
    interestCoverage: intCover > 98 ? 99 : intCover,

    // Valuation
    pe, pb, pegRatio, divYield,
    epsTrail, epsFor,
    targetHigh, targetLow, targetMean,
    recKey, recMean, analystCount,

    // Ownership
    promoterHolding: isIndia ? insiderPct : insiderPct,
    insiderPct, instPct, shortPct
  });
});

// Search endpoint — autocomplete suggestions
app.get('/api/search/:query', async (req, res) => {
  const q = encodeURIComponent(req.params.query);
  try {
    const url  = `https://query1.finance.yahoo.com/v1/finance/search?q=${q}&quotesCount=8&newsCount=0&enableFuzzyQuery=false&quotesQueryId=tss_match_phrase_query`;
    const resp = await fetch(url, { headers: YF_HEADERS, timeout: 8000 });
    const json = await resp.json();
    const hits = (json.quotes || [])
      .filter(q => q.quoteType === 'EQUITY')
      .slice(0, 6)
      .map(q => ({ symbol: q.symbol, name: q.shortname || q.longname || q.symbol, exchange: q.exchDisp || q.exchange }));
    res.json(hits);
  } catch(e) {
    res.json([]);
  }
});

app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

app.listen(PORT, () => {
  console.log(`\n✅ StockSage running at http://localhost:${PORT}\n`);
  console.log(`   Just open that URL in your browser!\n`);
});
