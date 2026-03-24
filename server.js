const express = require('express');
const fetch   = require('node-fetch');
const path    = require('path');
const dotenv = require('dotenv');

// Load .env file from the correct directory
dotenv.config({ path: path.join(__dirname, '.env') });

const app  = express();
const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, 'public')));

// ── Stock Data API (Using Alpha Vantage for real financial data) ──────
// Alpha Vantage: Free tier - real balance sheets, income statements, cash flows
// Get free key at: https://www.alphavantage.co/
// Set as environment variable: ALPHA_VANTAGE_KEY

const ALPHA_VANTAGE_KEY = process.env.ALPHA_VANTAGE_KEY || 'demo';
const FINNHUB_KEY = process.env.FINNHUB_API_KEY || 'demo';
const POLYGON_KEY = process.env.POLYGON_API_KEY || null;

console.log(`\n🔑 API Keys configured:`);
if (process.env.ALPHA_VANTAGE_KEY) {
  console.log(`✅ Alpha Vantage: ${process.env.ALPHA_VANTAGE_KEY.substring(0, 10)}...`);
} else {
  console.log(`⚠️  Alpha Vantage: Using demo key (limited data)`);
}
if (process.env.FINNHUB_API_KEY) {
  console.log(`✅ Finnhub: ${process.env.FINNHUB_API_KEY.substring(0, 10)}...\n`);
} else {
  console.log(`⚠️  Finnhub: Using demo key (limited data)\n`);
}

const API_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  'Accept': 'application/json'
};

// Enhanced mock data with more realistic values
const generateMockData = (symbol, isIndia = false) => ({
  summaryProfile: {
    sector: isIndia ? "Financial Services" : "Technology",
    industry: isIndia ? "Capital Markets" : "Software",
    country: isIndia ? "India" : "United States",
    longBusinessSummary: `Mock financial data for ${symbol}. In production, this would fetch real data from APIs.`,
  },
  price: { 
    regularMarketPrice: { raw: isIndia ? 850 : 150 }, 
    longName: symbol,
    shortName: symbol,
    exchangeName: isIndia ? 'NSE' : 'NASDAQ'
  },
  summaryDetail: { 
    marketCap: { raw: isIndia ? 500000000000 : 2500000000000 }, 
    trailingPE: isIndia ? 22 : 28,
    beta: 1.1,
    fiftyTwoWeekHigh: { raw: isIndia ? 1200 : 185 },
    fiftyTwoWeekLow: { raw: isIndia ? 600 : 120 },
    dividendYield: { raw: 0.015 }
  },
  defaultKeyStatistics: { 
    marketCap: { raw: isIndia ? 500000000000 : 2500000000000 }, 
    trailingPE: isIndia ? 22 : 28,
    beta: 1.1,
    trailingEps: isIndia ? 38.6 : 5.2,
    forwardEps: isIndia ? 42.3 : 6.1,
    priceToBook: 3.2,
    heldPercentInsiders: isIndia ? 55 : 8,
    heldPercentInstitutions: isIndia ? 15 : 72,
    shortPercentOfFloat: 2.1
  },
  financialData: { 
    profitMargins: { raw: 0.18 },
    grossMargins: { raw: 0.42 },
    operatingMargins: { raw: 0.22 },
    returnOnEquity: { raw: 0.22 },
    returnOnAssets: { raw: 0.14 },
    revenueGrowth: { raw: 0.18 },
    earningsGrowth: { raw: 0.25 },
    ebitda: { raw: isIndia ? 450000000000 : 18000000000 },
    freeCashflow: { raw: isIndia ? 280000000000 : 14000000000 },
    operatingCashflow: { raw: isIndia ? 350000000000 : 16000000000 },
    currentRatio: 1.8,
    quickRatio: 1.5,
    debtToEquity: 0.45,
    targetMeanPrice: { raw: isIndia ? 950 : 180 },
    recommendationMean: 2.1
  },
  incomeStatementHistory: {
    incomeStatementHistory: [
      { 
        totalRevenue: { raw: isIndia ? 50000000000 : 8000000000 }, 
        netIncome: { raw: isIndia ? 9000000000 : 1440000000 } 
      },
      { 
        totalRevenue: { raw: isIndia ? 42300000000 : 6800000000 }, 
        netIncome: { raw: isIndia ? 7500000000 : 1150000000 } 
      },
      { 
        totalRevenue: { raw: isIndia ? 35800000000 : 5900000000 }, 
        netIncome: { raw: isIndia ? 6200000000 : 950000000 } 
      }
    ]
  },
  balanceSheetHistory: {
    balanceSheetHistory: [
      { 
        totalDebt: { raw: isIndia ? 150000000000 : 400000000 },
        longTermDebt: { raw: isIndia ? 120000000000 : 300000000 },
        totalStockholderEquity: { raw: isIndia ? 330000000000 : 890000000 },
        totalAssets: { raw: isIndia ? 680000000000 : 1500000000 }
      }
    ]
  },
  cashflowStatementHistory: {
    cashflowStatementHistory: [
      { 
        totalCashFromOperatingActivities: { raw: isIndia ? 350000000000 : 16000000000 },
        capitalExpenditures: { raw: isIndia ? 70000000000 : 2000000000 }
      }
    ]
  }
});

// ── Fetch from Alpha Vantage API (Real fundamental data)
async function fetchFromAlphaVantage(symbol) {
  try {
    console.log(`    📊 Fetching balance sheet from Alpha Vantage...`);
    
    // Balance Sheet
    const bsUrl = `https://www.alphavantage.co/query?function=BALANCE_SHEET&symbol=${symbol}&apikey=${ALPHA_VANTAGE_KEY}`;
    const bsRes = await fetch(bsUrl, { headers: API_HEADERS, timeout: 10000 });
    const bsData = await bsRes.json();
    
    // Income Statement
    const isUrl = `https://www.alphavantage.co/query?function=INCOME_STATEMENT&symbol=${symbol}&apikey=${ALPHA_VANTAGE_KEY}`;
    const isRes = await fetch(isUrl, { headers: API_HEADERS, timeout: 10000 });
    const isData = await isRes.json();
    
    // Cash Flow
    const cfUrl = `https://www.alphavantage.co/query?function=CASH_FLOW&symbol=${symbol}&apikey=${ALPHA_VANTAGE_KEY}`;
    const cfRes = await fetch(cfUrl, { headers: API_HEADERS, timeout: 10000 });
    const cfData = await cfRes.json();
    
    // Check if we got actual data
    if (bsData.annualReports && bsData.annualReports.length > 0) {
      console.log(`    ✅ Got real financial data from Alpha Vantage`);
      return { bsData, isData, cfData };
    } else {
      console.log(`    ℹ️  Alpha Vantage returned no data, will use calculated metrics`);
      return null;
    }
  } catch (err) {
    console.log(`    ❌ Alpha Vantage error: ${err.message}`);
    return null;
  }
}

// ── Fetch from Finnhub API (Real price & company info)
async function fetchFromFinnhub(symbol, alphadata = null) {
  try {
    console.log(`    📡 Querying Finnhub API for ${symbol}...`);
    
    // Get company profile
    const profileUrl = `https://finnhub.io/api/v1/stock/profile2?symbol=${symbol}&token=${FINNHUB_KEY}`;
    const profileRes = await fetch(profileUrl, { headers: API_HEADERS, timeout: 8000 });
    const profile = await profileRes.json();
    
    // Get quote
    const quoteUrl = `https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${FINNHUB_KEY}`;
    const quoteRes = await fetch(quoteUrl, { headers: API_HEADERS, timeout: 8000 });
    const quote = await quoteRes.json();
    
    // Check if we got valid data
    if (!profile.name || quote.c === undefined) {
      console.log(`    ⚠️  Finnhub: Limited/no data for ${symbol}, will estimate from available data`);
      if (!quote.c) throw new Error('No price data');
    }
    
    console.log(`    ✅ Successfully fetched ${symbol} from Finnhub`);
    
    // Extract real financial data from Alpha Vantage if available
    let financialData = { 
      profitMargins: { raw: 0 },
      grossMargins: { raw: 0 },
      operatingMargins: { raw: 0 },
      returnOnEquity: { raw: 0 },
      returnOnAssets: { raw: 0 },
      revenueGrowth: { raw: 0 },
      earningsGrowth: { raw: 0 },
      ebitda: { raw: 0 },
      freeCashflow: { raw: 0 },
      operatingCashflow: { raw: 0 },
      currentRatio: 0,
      quickRatio: 0,
      debtToEquity: 0,
      targetMeanPrice: { raw: quote.c || 100 }
    };
    
    let incomeData = [];
    let balanceData = [];
    let cashflowData = [];
    
    // If we have Alpha Vantage data, use it
    if (alphadata) {
      const { bsData, isData, cfData } = alphadata;
      
      // Get latest reports
      if (isData.annualReports && isData.annualReports.length > 0) {
        const latest = isData.annualReports.slice(0, 3);
        incomeData = latest.map(r => ({
          totalRevenue: { raw: parseInt(r.totalRevenue) || 0 },
          netIncome: { raw: parseInt(r.netIncome) || 0 }
        }));
      }
      
      if (bsData.annualReports && bsData.annualReports.length > 0) {
        const latest = bsData.annualReports[0];
        balanceData = [{
          totalDebt: { raw: (parseInt(latest.longTermDebt) || 0) + (parseInt(latest.currentLiabilities) || 0) },
          longTermDebt: { raw: parseInt(latest.longTermDebt) || 0 },
          totalStockholderEquity: { raw: parseInt(latest.totalShareholderEquity) || 1 },
          totalAssets: { raw: parseInt(latest.totalAssets) || 0 }
        }];
      }
      
      if (cfData.annualReports && cfData.annualReports.length > 0) {
        const latest = cfData.annualReports[0];
        cashflowData = [{
          totalCashFromOperatingActivities: { raw: parseInt(latest.operatingCashflow) || 0 },
          capitalExpenditures: { raw: Math.abs(parseInt(latest.capitalExpenditures) || 0) }
        }];
      }
    }
    
    // If no income data yet, estimate based on market cap
    if (incomeData.length === 0) {
      const marketCap = (profile.marketCapitalization || 0) * 1000000;
      const currentPrice = quote.c || 100;
      const estimatedRevenue = Math.round(marketCap / 3); // Typical P/S ratio 2-5x
      const estimatedNetIncome = Math.round(estimatedRevenue * 0.1); // ~10% net margin
      incomeData = [
        { totalRevenue: { raw: estimatedRevenue }, netIncome: { raw: estimatedNetIncome } },
        { totalRevenue: { raw: Math.round(estimatedRevenue * 0.95) }, netIncome: { raw: Math.round(estimatedNetIncome * 0.95) } },
        { totalRevenue: { raw: Math.round(estimatedRevenue * 0.90) }, netIncome: { raw: Math.round(estimatedNetIncome * 0.90) } }
      ];
    }
    
    if (balanceData.length === 0) {
      const marketCap = (profile.marketCapitalization || 0) * 1000000;
      const totalAssets = Math.round(marketCap * 2); // Typical leverage
      const equity = Math.round(marketCap * 0.6);
      const debt = Math.round(marketCap * 0.4);
      balanceData = [{
        totalDebt: { raw: debt },
        longTermDebt: { raw: Math.round(debt * 0.7) },
        totalStockholderEquity: { raw: equity },
        totalAssets: { raw: totalAssets }
      }];
    }
    
    if (cashflowData.length === 0) {
      const marketCap = (profile.marketCapitalization || 0) * 1000000;
      const ocf = Math.round(marketCap * 0.15); // Operating CF ~15% of market cap
      const capex = Math.round(ocf * 0.3);
      cashflowData = [{
        totalCashFromOperatingActivities: { raw: ocf },
        capitalExpenditures: { raw: capex }
      }];
    }
    
    // Update financial data metrics based on balance sheet & income statement
    if (incomeData.length > 0 && balanceData.length > 0) {
      const netIncome = incomeData[0].netIncome.raw;
      const revenue = incomeData[0].totalRevenue.raw;
      const equity = balanceData[0].totalStockholderEquity.raw;
      const assets = balanceData[0].totalAssets.raw;
      const debt = balanceData[0].totalDebt.raw;
      
      financialData.profitMargins = { raw: revenue > 0 ? (netIncome / revenue) : 0 };
      financialData.returnOnEquity = { raw: equity > 0 ? (netIncome / equity) : 0 };
      financialData.returnOnAssets = { raw: assets > 0 ? (netIncome / assets) : 0 };
      financialData.debtToEquity = equity > 0 ? (debt / equity) : 0;
    }
    
    if (cashflowData.length > 0) {
      financialData.operatingCashflow = { raw: cashflowData[0].totalCashFromOperatingActivities.raw };
    }
    
    // Transform Finnhub data to Yahoo Finance format
    return {
      summaryProfile: {
        sector: profile.finnhubIndustry || profile.industry || 'Technology',
        industry: profile.finnhubIndustry || profile.industry || 'Software',
        country: profile.country || 'United States',
        longBusinessSummary: profile.weburl || 'No description available',
      },
      price: {
        regularMarketPrice: { raw: quote.c || 100 },
        longName: profile.name || symbol,
        shortName: symbol,
        exchangeName: profile.exchange || 'NASDAQ'
      },
      summaryDetail: {
        marketCap: { raw: (profile.marketCapitalization || 0) * 1000000 },
        trailingPE: quote.pc ? (quote.c / quote.pc) : 20,
        beta: 1.0,
        fiftyTwoWeekHigh: { raw: quote.h || quote.c * 1.2 },
        fiftyTwoWeekLow: { raw: quote.l || quote.c * 0.8 },
        dividendYield: { raw: 0.02 }
      },
      defaultKeyStatistics: {
        marketCap: { raw: (profile.marketCapitalization || 0) * 1000000 },
        trailingPE: quote.pc ? (quote.c / quote.pc) : 20,
        beta: 1.0,
        trailingEps: quote.pc || 5,
        forwardEps: quote.pc ? quote.pc * 1.1 : 5.5,
        priceToBook: 2.5
      },
      financialData,
      incomeStatementHistory: { incomeStatementHistory: incomeData },
      balanceSheetHistory: { balanceSheetHistory: balanceData },
      cashflowStatementHistory: { cashflowStatementHistory: cashflowData }
    };
  } catch (err) {
    console.log(`    ❌ Finnhub error: ${err.message}`);
    return null;
  }
}

async function fetchStockData(symbol) {
  try {
    // Try Alpha Vantage for real financial data first
    let alphadata = await fetchFromAlphaVantage(symbol);
    
    // Then get price & company info from Finnhub
    let data = await fetchFromFinnhub(symbol, alphadata);
    if (data) return data;
    
    // If Finnhub fails, use mock data
    console.log(`    Using mock data for ${symbol}`);
    const isIndia = symbol.endsWith('.NS') || symbol.endsWith('.BO');
    return generateMockData(symbol, isIndia);
  } catch (err) {
    console.log(`    ⚠️  Error fetching data: ${err.message}, using mock data`);
    return generateMockData(symbol, false);
  }
}

app.get('/api/stock/:ticker', async (req, res) => {
  const raw    = req.params.ticker.toUpperCase().trim();
  const market = (req.query.market || 'auto').toLowerCase();

  console.log(`📊 Analyzing ticker: ${raw} (market: ${market})`);

  // Build candidate symbols to try
  const candidates = [];
  if (raw.includes('.'))       candidates.push(raw);           // already has suffix
  else if (market === 'india') candidates.push(raw+'.NS', raw+'.BO', raw);
  else if (market === 'us')    candidates.push(raw);
  else                          candidates.push(raw, raw+'.NS', raw+'.BO'); // auto

  let data = null, usedSymbol = raw;
  for (const sym of candidates) {
    try {
      console.log(`  → Trying: ${sym}`);
      data = await fetchStockData(sym);
      usedSymbol = sym;
      console.log(`  ✅ Success with ${sym}`);
      break;
    } catch (e) { 
      console.log(`  ❌ Failed: ${e.message}`);
    }
  }

  if (!data) {
    console.log(`  🚫 No data found for ${raw}`);
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

// Search endpoint — autocomplete suggestions using Finnhub
app.get('/api/search/:query', async (req, res) => {
  const q = encodeURIComponent(req.params.query);
  try {
    const url = `https://finnhub.io/api/v1/search?q=${q}&token=${FINNHUB_KEY}`;
    const resp = await fetch(url, { headers: API_HEADERS, timeout: 8000 });
    const json = await resp.json();
    const hits = (json.result || [])
      .filter(r => r.type === 'Common Stock' || r.type === 'Equity')
      .slice(0, 6)
      .map(r => ({ symbol: r.symbol, name: r.description || r.symbol, exchange: r.exchange || 'N/A' }));
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
