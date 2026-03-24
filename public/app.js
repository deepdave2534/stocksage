/* ══════════════════════════════════════════════════════════
   StockSage — Frontend App
   ══════════════════════════════════════════════════════════ */

let STOCK = null;          // raw API data
let ANALYSIS = null;       // computed analysis object
let suggestTimer = null;
let activeIdx = -1;

// ── NAVIGATION ───────────────────────────────────────────
function showHome() {
  document.getElementById('homeScreen').style.display = 'flex';
  document.getElementById('resultScreen').style.display = 'none';
  document.getElementById('loadingScreen').style.display = 'none';
  document.getElementById('headerSearch').style.display = 'none';
  document.getElementById('mktBadge').style.display = 'none';
  document.getElementById('mainTicker').value = '';
  closeDrop('mainDrop'); closeDrop('hdrDrop');
}

function switchTab(name, btn) {
  document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.getElementById('tab-' + name).classList.add('active');
  if (btn) btn.classList.add('active');
}

// ── SEARCH SUGGEST ───────────────────────────────────────
function searchSuggest(q, dropId) {
  clearTimeout(suggestTimer);
  activeIdx = -1;
  if (!q.trim()) { closeDrop(dropId); return; }
  suggestTimer = setTimeout(async () => {
    try {
      const r = await fetch('/api/search/' + encodeURIComponent(q));
      const hits = await r.json();
      renderDrop(hits, dropId);
    } catch(e) { closeDrop(dropId); }
  }, 200);
}

function renderDrop(hits, dropId) {
  const el = document.getElementById(dropId);
  if (!hits.length) { closeDrop(dropId); return; }
  el.innerHTML = hits.map((h,i) => `
    <div class="suggest-item" data-sym="${h.symbol}" onclick="analyze('${h.symbol}')">
      <span class="sug-sym">${h.symbol}</span>
      <span class="sug-name">${h.name}</span>
      <span class="sug-exch">${h.exchange}</span>
    </div>`).join('');
  el.classList.add('open');
}

function closeDrop(id) {
  const el = document.getElementById(id);
  if (el) { el.classList.remove('open'); el.innerHTML = ''; }
}

function handleKey(e, dropId) {
  const el = document.getElementById(dropId);
  const items = el?.querySelectorAll('.suggest-item') || [];
  if (e.key === 'ArrowDown') { activeIdx = Math.min(activeIdx+1, items.length-1); highlightItem(items); e.preventDefault(); }
  else if (e.key === 'ArrowUp') { activeIdx = Math.max(activeIdx-1, 0); highlightItem(items); e.preventDefault(); }
  else if (e.key === 'Enter') {
    if (activeIdx >= 0 && items[activeIdx]) { analyze(items[activeIdx].dataset.sym); }
    else { const inp = e.target.value.trim(); if (inp) analyze(inp); }
    e.preventDefault();
  } else if (e.key === 'Escape') { closeDrop(dropId); }
}

function highlightItem(items) {
  items.forEach((el, i) => el.classList.toggle('active', i === activeIdx));
  if (items[activeIdx]) items[activeIdx].scrollIntoView({ block: 'nearest' });
}

// ── LOADING ANIMATION ────────────────────────────────────
const LOAD_STEPS = [
  'Connecting to Yahoo Finance API…',
  'Fetching income statement data…',
  'Fetching balance sheet & cash flows…',
  'Running 59-framework analysis engine…',
  'Computing moat, valuation & forensic scores…',
  'Building your report…'
];

function showLoading(ticker) {
  document.getElementById('homeScreen').style.display = 'none';
  document.getElementById('resultScreen').style.display = 'none';
  document.getElementById('loadingScreen').style.display = 'flex';
  document.getElementById('loadingTicker').textContent = ticker.toUpperCase();
  const steps = document.getElementById('loadingSteps');
  steps.innerHTML = LOAD_STEPS.map((s,i) =>
    `<div class="lstep" id="lstep${i}">⏳ ${s}</div>`).join('');
  let i = 0;
  return setInterval(() => {
    if (i > 0) {
      const prev = document.getElementById('lstep'+(i-1));
      if (prev) { prev.className='lstep done'; prev.textContent = '✅ ' + LOAD_STEPS[i-1]; }
    }
    if (i < LOAD_STEPS.length) {
      const cur = document.getElementById('lstep'+i);
      if (cur) cur.className = 'lstep active';
      i++;
    }
  }, 600);
}

// ── MAIN ANALYZE ─────────────────────────────────────────
async function analyze(ticker) {
  if (!ticker?.trim()) return;
  ticker = ticker.trim().toUpperCase();
  closeDrop('mainDrop'); closeDrop('hdrDrop');

  const timer = showLoading(ticker);
  try {
    const res  = await fetch(`/api/stock/${encodeURIComponent(ticker)}`);
    const data = await res.json();
    clearInterval(timer);
    if (!res.ok || data.error) throw new Error(data.error || 'Stock not found');
    STOCK    = data;
    ANALYSIS = computeAnalysis(data);
    renderAll();
  } catch(err) {
    clearInterval(timer);
    document.getElementById('loadingScreen').style.display = 'none';
    document.getElementById('homeScreen').style.display = 'flex';
    // Show error in search box
    const inp = document.getElementById('mainTicker');
    inp.style.borderColor = 'var(--red)';
    inp.placeholder = '⚠ ' + err.message;
    setTimeout(() => { inp.style.borderColor=''; inp.placeholder='e.g.  RELIANCE  ·  CDSL  ·  AAPL  ·  NVDA'; }, 4000);
  }
}

// ── ANALYSIS ENGINE ──────────────────────────────────────
function computeAnalysis(d) {
  const clamp = (v,a,b) => Math.min(b, Math.max(a, v));
  const n = v => (isFinite(v) && !isNaN(v)) ? v : 0;

  // ── Porter's Five Forces (qualitative from ratios)
  const pricingPow = d.netMargin > 20 ? 3 : d.netMargin > 10 ? 2 : 1;
  const switching  = d.grossMargin > 50 || d.roe > 25 ? 3 : d.grossMargin > 30 ? 2 : 1;
  const scalability= d.netMargin > 15 && d.revGrowth3 > 12 ? 3 : d.netMargin > 8 ? 2 : 1;
  const competition= d.roce > 25 && d.marketCap > 5000 ? 3 : d.roce > 15 ? 2 : 1;
  const tailwind   = d.revGrowth3 > 18 ? 3 : d.revGrowth3 > 8 ? 2 : 1;

  const porters = {
    newEntrants: clamp(switching + pricingPow + (d.roce>20?2:d.roce>12?1:0), 1, 10),
    supplierPow: clamp(8 - scalability - (d.debtEquity<0.5?1:0), 1, 10),
    buyerPow:    clamp(9 - pricingPow - switching, 1, 10),
    substitutes: clamp(pricingPow + switching + (d.roce>20?2:1), 1, 10),
    rivalry:     clamp(competition + tailwind + (d.revGrowth3>15?1:0), 1, 10)
  };
  const portersTotal = Object.values(porters).reduce((a,b)=>a+b,0);

  // ── Moat Score /100
  let moat = 0;
  moat += clamp(d.roce / 5, 0, 20);
  moat += clamp(pricingPow * 8, 0, 24);
  moat += clamp(switching * 6, 0, 18);
  moat += clamp(competition * 5, 0, 15);
  moat += d.cfoPATRatio > 0.9 ? 8 : d.cfoPATRatio > 0.7 ? 5 : 2;
  moat += d.revGrowth3 > 20 ? 7 : d.revGrowth3 > 12 ? 4 : 1;
  moat += d.debtEquity < 0.3 ? 8 : d.debtEquity < 1 ? 4 : 0;
  const moatScore = clamp(Math.round(moat), 0, 100);
  const moatType  = switching>2 ? 'Switching Costs' : pricingPow>2 ? 'Pricing Power / Intangibles' : competition>2 ? 'Efficient Scale' : 'Cost Advantage';
  const moatStr   = moatScore >= 65 ? 'Wide' : moatScore >= 40 ? 'Narrow' : 'None';

  // ── Accounting score /10
  let acc = 10;
  if (d.cfoPATRatio < 0.7) acc -= 3; else if (d.cfoPATRatio < 0.9) acc -= 1;
  if (d.debtEquity > 2) acc -= 3; else if (d.debtEquity > 1) acc -= 1;
  if (d.interestCoverage < 3) acc -= 2; else if (d.interestCoverage < 6) acc -= 1;
  if (d.promoterHolding < 20 && d.market==='India') acc -= 1;
  if (d.profitGrowth3 < -5) acc -= 1;
  const accScore = clamp(acc, 1, 10);

  // ── Management score /10
  let mgmt = 0;
  mgmt += (d.market==='India' ? (d.promoterHolding>50?3:d.promoterHolding>35?2:1) : (d.insiderPct>5?3:d.insiderPct>2?2:1));
  mgmt += d.roe > 20 ? 3 : d.roe > 12 ? 2 : 1;
  mgmt += d.cfoPATRatio > 0.9 ? 2 : d.cfoPATRatio > 0.7 ? 1 : 0;
  mgmt += d.revGrowth3 > 15 ? 2 : d.revGrowth3 > 5 ? 1 : 0;
  const mgmtScore = clamp(Math.round(mgmt), 1, 10);

  // ── Fraud score /10 (lower = safer)
  let fraud = 0;
  if (d.cfoPATRatio < 0.5) fraud += 3; else if (d.cfoPATRatio < 0.7) fraud += 1;
  if (d.debtEquity > 3) fraud += 2; else if (d.debtEquity > 2) fraud += 1;
  if (d.profitGrowth3 < -15) fraud += 1;
  if (d.grossMargin > 80 && !['IT / Technology','Pharma'].some(s=>d.sector?.includes(s))) fraud += 1;
  const fraudScore = clamp(fraud, 0, 10);
  const fraudLevel = fraudScore<=1?'Low':fraudScore<=3?'Medium':'High';

  // ── Valuation verdict
  const peRatio = d.industryPe > 0 ? d.pe / d.industryPe : 1;
  const pegR    = n(d.pegRatio) || (d.profitGrowth3>0 ? d.pe/d.profitGrowth3 : 99);
  const valVerdict = (pegR < 0.8 && peRatio < 0.9) ? 'Undervalued'
                   : (pegR > 2.5 || peRatio > 1.6)  ? 'Overvalued'
                   : 'Fairly Valued';

  // ── Peter Lynch category
  const lynchCat = d.revGrowth3 > 18 && d.roce > 18 ? 'Fast Grower'
    : d.revGrowth3 < 6 && d.divYield > 2 ? 'Slow Grower'
    : (d.sector||'').match(/metal|chem|auto|real est|oil/i) ? 'Cyclical'
    : d.profitGrowth3 < -5 && d.revGrowth3 > 5 ? 'Turnaround'
    : 'Stalwart';

  // ── Return forecasts
  const baseGrowth = (n(d.revGrowth3) + n(d.profitGrowth3)) / 2;
  const reRating   = valVerdict==='Undervalued'?1.12:valVerdict==='Overvalued'?0.85:1;
  const cagr3 = clamp(Math.round(baseGrowth * 0.8 * reRating), -10, 60);
  const cagr5 = clamp(Math.round(baseGrowth * 0.75 * reRating), -5, 55);
  const x5    = Math.pow(1+cagr5/100, 5).toFixed(1);
  const x10   = Math.pow(1+cagr5*0.85/100, 10).toFixed(1);

  // ── Graham
  const grahamCriteria = [
    { label:`Revenue >${d.market==='India'?'₹500Cr':'$100M'}`, pass: d.revenue>(d.market==='India'?500:100) },
    { label:'Debt/Equity < 2x',       pass: d.debtEquity < 2 },
    { label:'Positive profit growth',  pass: d.profitGrowth3 > 0 },
    { label:'Pays dividend',           pass: d.divYield > 0 },
    { label:'Revenue growing >3%/yr',  pass: d.revGrowth3 > 3 },
    { label:'P/E < 15x',              pass: d.pe > 0 && d.pe < 15 },
    { label:'P/B < 1.5x',             pass: d.pb > 0 && d.pb < 1.5 }
  ];
  const grahamScore = grahamCriteria.filter(c=>c.pass).length;
  const epv = d.equity > 0 ? Math.round(d.ebitda * 0.65 / 0.12) : 0;

  // ── Weinstein stage
  const weinStage = d.revGrowth3>15&&d.profitGrowth3>15&&d.roce>18 ? 'Stage 2 — Uptrend'
    : d.revGrowth3>5&&d.profitGrowth3>5 ? 'Stage 1/2 — Accumulation'
    : d.revGrowth3<0||d.profitGrowth3<-10 ? 'Stage 3/4 — Downtrend'
    : 'Stage 1 — Base Building';
  const weinColor = weinStage.includes('2')?'var(--green)':weinStage.includes('Downtrend')?'var(--red)':'var(--amber)';

  // ── Conviction & verdict
  let conv = 0;
  conv += clamp(moatScore * 0.25, 0, 25);
  conv += clamp(accScore * 2, 0, 20);
  conv += clamp(mgmtScore * 1.5, 0, 15);
  conv += clamp((10-fraudScore)*1.5, 0, 15);
  conv += valVerdict==='Undervalued'?15:valVerdict==='Fairly Valued'?10:4;
  conv += clamp(cagr3 * 0.2, 0, 10);
  const convScore = clamp(Math.round(conv), 0, 100);

  const verdict = convScore>=75&&fraudScore<=2&&moatScore>=60 ? 'Strong Buy'
    : convScore>=58&&fraudScore<=3&&moatScore>=40 ? 'Buy'
    : convScore>=40 ? 'Hold / Watch'
    : 'Avoid';
  const verdictColor = verdict==='Strong Buy'?'var(--green)':verdict==='Buy'?'var(--blue)':verdict==='Hold / Watch'?'var(--amber)':'var(--red)';
  const allocType  = verdict==='Strong Buy'?'High':verdict==='Buy'?'Medium':verdict==='Hold / Watch'?'Low':'Avoid';
  const allocPct   = verdict==='Strong Buy'?'8–12%':verdict==='Buy'?'4–7%':verdict==='Hold / Watch'?'2–3%':'0%';

  // ── Entry matrix
  const fairPE = Math.min((d.industryPe||25)*0.9, 40);
  const idealPrice  = d.pe>0 ? Math.round(d.price*(fairPE*0.75)/d.pe) : 0;
  const acceptPrice = d.pe>0 ? Math.round(d.price*(fairPE*0.9)/d.pe)  : 0;
  const waitPrice   = Math.round(d.price*1.15);
  const currentZone = d.pe>0&&d.pe<=fairPE*0.8 ? 'Ideal' : d.pe>0&&d.pe<=fairPE ? 'Acceptable' : 'Wait';

  return {
    pricingPow, switching, scalability, competition, tailwind,
    porters, portersTotal,
    moatScore, moatType, moatStr,
    accScore, mgmtScore, fraudScore, fraudLevel,
    valVerdict, pegR: +pegR.toFixed(2), lynchCat,
    cagr3, cagr5, x5, x10,
    grahamCriteria, grahamScore, epv,
    weinStage, weinColor,
    convScore, verdict, verdictColor, allocType, allocPct,
    idealPrice, acceptPrice, waitPrice, currentZone,
    baseGrowth
  };
}

// ── RENDER ALL ───────────────────────────────────────────
function renderAll() {
  const d = STOCK, a = ANALYSIS;
  document.getElementById('loadingScreen').style.display = 'none';
  document.getElementById('homeScreen').style.display   = 'none';
  document.getElementById('resultScreen').style.display = 'block';
  document.getElementById('headerSearch').style.display = 'block';
  document.getElementById('headerTicker').value = d.symbol;

  const badge = document.getElementById('mktBadge');
  badge.style.display = 'inline-block';
  badge.textContent   = d.market === 'India' ? '🇮🇳 India' : '🇺🇸 US';
  badge.style.cssText += d.market==='India'
    ? ';background:#3b8ef015;border:1px solid #3b8ef030;color:var(--blue);padding:3px 10px;border-radius:12px;font-size:10px;font-weight:600'
    : ';background:rgba(201,162,39,.12);border:1px solid var(--gold2);color:var(--gold);padding:3px 10px;border-radius:12px;font-size:10px;font-weight:600';

  document.getElementById('dataTimestamp').textContent = `Data: ${d.name} · ${new Date().toLocaleString()}`;
  renderHeader();
  renderOverview();
  renderFinancials();
  renderMoat();
  renderValuation();
  renderForensic();
  renderFrameworks();
  renderVerdict();
  switchTab('overview', document.querySelector('.tab'));
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// helpers
const C  = (v,h,m) => v>=h?'var(--green)':v>=m?'var(--amber)':'var(--red)';
const CI = (v,h,m) => v<=h?'var(--green)':v<=m?'var(--amber)':'var(--red)'; // inverse
const fmt = (v,d=1) => (+v).toFixed(d);

function srow(label, val, max, color) {
  const pct = Math.min(100, Math.max(0, (val/max)*100));
  return `<div class="srow">
    <div class="srow-lbl">${label}</div>
    <div class="srow-track"><div class="srow-fill" style="width:${pct}%;background:${color}"></div></div>
    <div class="srow-val" style="color:${color}">${val}</div>
  </div>`;
}

function sigrow(icon, title, desc) {
  return `<div class="sigrow">
    <span class="sigrow-icon">${icon}</span>
    <div><div class="sigrow-title">${title}</div><div class="sigrow-desc">${desc}</div></div>
  </div>`;
}

function kpi(label, val, sub, ctx, tipText) {
  const t = tipText ? `<span class="tip" data-tip="${tipText}">?</span>` : '';
  return `<div class="kpi">
    <div class="kpi-lbl">${label}${t}</div>
    <div class="kpi-val">${val}</div>
    ${sub?`<div class="kpi-sub">${sub}</div>`:''}
    ${ctx?`<div class="kpi-ctx">${ctx}</div>`:''}
  </div>`;
}

function vb(v) {
  if (v?.includes('Strong Buy')) return `<span class="vb vb-sb">${v}</span>`;
  if (v?.includes('Buy'))        return `<span class="vb vb-b">${v}</span>`;
  if (v?.includes('Hold'))       return `<span class="vb vb-h">${v}</span>`;
  return `<span class="vb vb-a">${v}</span>`;
}

function allocBadge(t, p) {
  const cls = t==='High'?'ab-h':t==='Medium'?'ab-m':t==='Low'?'ab-l':'ab-av';
  return `<span class="${cls}">${t} · ${p}</span>`;
}

// ── HEADER ───────────────────────────────────────────────
function renderHeader() {
  const d = STOCK, a = ANALYSIS;
  document.getElementById('stockHeader').innerHTML = `
    <div class="stkh-left">
      <h1>${d.name} <span style="font-size:14px;color:var(--text3)">(${d.symbol})</span></h1>
      <div class="stkh-badges">
        <span class="badge badge-gold">${d.symbol}</span>
        <span class="badge badge-blue">${d.exchange}</span>
        <span class="badge badge-muted">${d.sector||d.industry||'–'}</span>
        <span style="margin-left:4px">${vb(a.verdict)}</span>
      </div>
    </div>
    <div class="stkh-right">
      <div class="stkh-stat">
        <div class="stkh-stat-lbl">Price</div>
        <div class="stkh-stat-val">${d.currency}${(+d.price).toLocaleString()}</div>
      </div>
      <div class="stkh-stat">
        <div class="stkh-stat-lbl">Market Cap</div>
        <div class="stkh-stat-val">${d.currency}${(+d.marketCap).toLocaleString()} ${d.unit}</div>
      </div>
      <div class="stkh-stat">
        <div class="stkh-stat-lbl">52W Range</div>
        <div class="stkh-stat-val" style="font-size:14px">${d.currency}${d.fiftyTwoL} – ${d.currency}${d.fiftyTwoH}</div>
      </div>
    </div>`;
}

// ── OVERVIEW ─────────────────────────────────────────────
function renderOverview() {
  const d = STOCK, a = ANALYSIS;
  let H = `
  <div class="sec-title">${d.name}</div>
  <div class="sec-sub">${d.sector||''} · ${d.exchange} · ${d.country||''}</div>

  <div class="verdict-hero">
    <div class="vh-left">
      <div class="vh-eyebrow">Investment Verdict</div>
      <div class="vh-word" style="color:${a.verdictColor}">${a.verdict}</div>
      <div style="margin-bottom:12px">${allocBadge(a.allocType,a.allocPct)}</div>
      <div class="vh-explain">${genRationale(d,a)}</div>
    </div>
    <div class="vh-scores">
      <div class="vsc"><div class="vsc-num" style="color:var(--gold)">${a.convScore}</div><div class="vsc-lbl">Conviction</div></div>
      <div class="vsc"><div class="vsc-num" style="color:var(--green)">${a.cagr3}%</div><div class="vsc-lbl">3Y CAGR est.</div></div>
      <div class="vsc"><div class="vsc-num" style="color:var(--blue)">${a.x10}x</div><div class="vsc-lbl">10Y Multiple</div></div>
      <div class="vsc"><div class="vsc-num" style="color:var(--gold)">${a.moatScore}</div><div class="vsc-lbl">Moat /100</div></div>
    </div>
  </div>

  <div class="kpi-grid">
    ${kpi('Business Moat',`${a.moatScore}<span style="font-size:11px;color:var(--text3)">/100</span>`,a.moatStr,a.moatType,'A moat is a competitive advantage that protects the business from rivals. Higher = harder to compete with.')}
    ${kpi('ROCE',`<span style="color:${C(d.roce,20,12)}">${d.roce}%</span>`,d.roce>=20?'Excellent':d.roce>=12?'Adequate':'Below avg','Return on Capital Employed','How efficiently management uses every rupee/dollar of capital. Above 20% = excellent.')}
    ${kpi('Revenue Growth 3Y',`<span style="color:${C(d.revGrowth3,15,8)}">${d.revGrowth3}%</span>`,d.revGrowth3>=15?'Strong growth':d.revGrowth3>=8?'Healthy':d.revGrowth3>=0?'Slow':'Declining','CAGR over 3 years','Compound annual growth in sales over the last 3 years.')}
    ${kpi('Net Margin',`<span style="color:${C(d.netMargin,15,8)}">${fmt(d.netMargin)}%</span>`,d.netMargin>=15?'High quality':'','% of sales kept as profit','How much of every ₹100 in sales the company keeps as profit after all costs.')}
    ${kpi('Debt/Equity',`<span style="color:${CI(d.debtEquity,0.5,1.5)}">${fmt(d.debtEquity,2)}x</span>`,d.debtEquity<=0.3?'Debt-free':d.debtEquity<=1?'Safe':'Watch','Balance sheet risk','Total debt divided by equity. Below 0.5 = very safe. Above 2 = risky.')}
    ${kpi('Accounting Score',`${a.accScore}<span style="color:var(--text3);font-size:11px">/10</span>`,a.accScore>=7?'Clean books':'Review needed','','How trustworthy are the financial statements? 10 = very clean, 1 = many flags.')}
    ${kpi('Lynch Category',`<span style="font-size:13px">${a.lynchCat}</span>`,'','Peter Lynch classification','')}
    ${kpi('Weinstein Stage',`<span style="font-size:12px;color:${a.weinColor}">${a.weinStage.split(' — ')[0]}</span>`,a.weinStage.split(' — ')[1]||'','Technical stage analysis','')}
  </div>

  <div class="g2">
    <div class="card">
      <div class="card-title">Porter's Five Forces — ${a.portersTotal}/50</div>
      ${srow("Barrier to New Entry",   a.porters.newEntrants,10, a.porters.newEntrants>=7?'var(--green)':a.porters.newEntrants>=5?'var(--amber)':'var(--red)')}
      ${srow("Supplier Power",         a.porters.supplierPow,10, 'var(--blue)')}
      ${srow("Buyer Power",            a.porters.buyerPow,  10, a.porters.buyerPow>=7?'var(--green)':'var(--amber)')}
      ${srow("Threat of Substitutes",  a.porters.substitutes,10, a.porters.substitutes>=7?'var(--green)':'var(--amber)')}
      ${srow("Competitive Rivalry",    a.porters.rivalry,   10, a.porters.rivalry>=7?'var(--green)':'var(--amber)')}
      <div style="margin-top:10px;font-family:'Lora',serif;font-size:13px;color:var(--text3)">${a.portersTotal>=35?'Strong competitive position — industry has significant barriers.':'Moderate competitive dynamics — market share can shift over time.'}</div>
    </div>
    <div class="card">
      <div class="card-title">Scorecard Summary</div>
      ${srow('Moat Score',         a.moatScore,    100,'var(--gold)')}
      ${srow('Five Forces',        a.portersTotal, 50, 'var(--blue)')}
      ${srow('Accounting Quality', a.accScore,     10, 'var(--green)')}
      ${srow('Management Quality', a.mgmtScore,    10, 'var(--amber)')}
      ${srow('Fraud Safety',       10-a.fraudScore,10, 'var(--green)')}
      ${srow('Overall Conviction', a.convScore,    100,'var(--gold)')}
    </div>
  </div>

  ${d.summary ? `<div class="note-box"><strong>${d.name}:</strong> ${d.summary}${d.summary.length>=500?'…':''}</div>` : ''}`;

  document.getElementById('tab-overview').innerHTML = H;
}

function genRationale(d, a) {
  const parts = [];
  if (a.moatScore>=65) parts.push(`${d.name} has a <strong style="color:var(--gold)">wide competitive moat</strong> via ${a.moatType.toLowerCase()}`);
  else if (a.moatScore>=40) parts.push(`${d.name} has a <strong>narrow moat</strong> with some competitive protection`);
  else parts.push(`${d.name} operates in a <strong style="color:var(--amber)">commoditised space</strong> with limited competitive advantage`);
  if (d.roce>=20) parts.push(`excellent capital efficiency (ROCE ${d.roce}%)`);
  else if (d.roce<12) parts.push(`below-average capital returns (ROCE ${d.roce}%)`);
  if (a.valVerdict==='Undervalued')  parts.push(`stock appears <strong style="color:var(--green)">attractively priced</strong>`);
  else if (a.valVerdict==='Overvalued') parts.push(`valuation looks <strong style="color:var(--red)">stretched</strong>`);
  if (a.fraudScore>=4) parts.push(`⚠️ accounting flags require caution`);
  return parts.join('; ') + '.';
}

// ── FINANCIALS ───────────────────────────────────────────
function renderFinancials() {
  const d = STOCK, a = ANALYSIS;
  const H = `
  <div class="sec-title">Financial Quality & Accounting</div>
  <div class="sec-sub">Income statement, balance sheet, cash flow & growth quality</div>

  <div class="kpi-grid">
    ${kpi('Revenue',`${d.currency}${(+d.revenue).toLocaleString()} ${d.unit}`,'')}
    ${kpi('Net Profit (PAT)',`<span style="color:var(--green)">${d.currency}${(+d.pat).toLocaleString()} ${d.unit}</span>`,'')}
    ${kpi('EBITDA',`${d.currency}${(+d.ebitda).toLocaleString()} ${d.unit}`,'')}
    ${kpi('EBITDA Margin',`<span style="color:${C(d.opMargin,20,12)}">${fmt(d.opMargin)}%</span>`,'Operating margin')}
    ${kpi('Revenue CAGR 3Y',`<span style="color:${C(d.revGrowth3,15,8)}">${d.revGrowth3}%</span>`,'3-year compound growth')}
    ${kpi('Profit CAGR 3Y',`<span style="color:${C(d.profitGrowth3,15,8)}">${d.profitGrowth3}%</span>`,'3-year compound growth')}
    ${kpi('CFO / PAT',`<span style="color:${C(d.cfoPATRatio,0.9,0.7)}">${fmt(d.cfoPATRatio,2)}</span>`,'Cash conversion quality','',`Cash earnings ÷ reported profit. Above 0.9 means profits are real cash. Below 0.7 is a red flag.`)}
    ${kpi('Interest Coverage',`<span style="color:${C(d.interestCoverage,6,3)}">${d.interestCoverage>=99?'Nil debt':fmt(d.interestCoverage,1)+'x'}</span>`,'EBITDA ÷ Interest','',`How many times can earnings cover interest payments. Above 6 = safe. Below 3 = risky.`)}
  </div>

  <div class="g2">
    <div class="card">
      <div class="card-title">Cash Flow Quality</div>
      ${sigrow(d.cfoPATRatio>=0.9?'✅':'⚠️',
        `CFO/PAT: ${fmt(d.cfoPATRatio,2)}`,
        d.cfoPATRatio>=0.9?'Excellent — cash earnings match reported profit. This company\'s profits are real.':d.cfoPATRatio>=0.7?'Acceptable — most profit is backed by real cash.':'Warning — profit may be on paper. Check for inflated receivables or deferred revenue.'
      )}
      ${sigrow(d.debtEquity<=0.5?'✅':d.debtEquity<=1.5?'🟡':'🔴',
        `Debt/Equity: ${fmt(d.debtEquity,2)}x`,
        d.debtEquity<=0.3?'Near debt-free. Company finances itself from profits — very low financial risk.':d.debtEquity<=0.8?'Conservative leverage. Debt is manageable.':d.debtEquity<=1.5?'Moderate debt. Watch for further borrowing.':'High debt is a risk. Interest payments consume significant earnings.'
      )}
      ${sigrow(d.interestCoverage>=6?'✅':d.interestCoverage>=3?'🟡':'🔴',
        `Interest Coverage: ${d.interestCoverage>=99?'No debt':fmt(d.interestCoverage,1)+'x'}`,
        d.interestCoverage>=99?'Company carries no meaningful debt — maximum financial safety.':d.interestCoverage>=6?'Comfortably covers interest. Financially safe.':d.interestCoverage>=3?'Manageable, but limited buffer in downturns.':'Low coverage — company may struggle to pay interest if earnings dip.'
      )}
      ${sigrow(d.currentRatio>=2?'✅':d.currentRatio>=1?'🟡':'🔴',
        `Current Ratio: ${fmt(d.currentRatio,2)}x`,
        d.currentRatio>=2?'Excellent liquidity. Can easily cover short-term obligations.':d.currentRatio>=1?'Adequate liquidity.':'Below 1 means more short-term liabilities than assets — watch carefully.'
      )}
    </div>
    <div class="card">
      <div class="card-title">Growth Quality</div>
      ${sigrow(d.revGrowth3>=15?'🚀':d.revGrowth3>=8?'📈':d.revGrowth3>=0?'🟡':'🔴',
        `Revenue CAGR: ${d.revGrowth3}% (3Y)`,
        d.revGrowth3>=20?'Outstanding — company is rapidly expanding its market presence.':d.revGrowth3>=12?'Healthy growth well above inflation.':d.revGrowth3>=5?'Moderate — growing but not compounding fast.':'Slow or declining revenue. Business may be stagnating.'
      )}
      ${sigrow(d.profitGrowth3>=15?'🚀':d.profitGrowth3>=8?'📈':d.profitGrowth3>=0?'🟡':'🔴',
        `Profit CAGR: ${d.profitGrowth3}% (3Y)`,
        d.profitGrowth3>=20?'Profits growing faster than sales — operating leverage and margin expansion.':d.profitGrowth3>=10?'Good profit growth.':d.profitGrowth3>=0?'Profits growing slowly. Margins may be pressured.':'Profits declining — investigate the root cause before investing.'
      )}
      ${sigrow(d.netMargin>=15?'✅':d.netMargin>=8?'🟡':'⚠️',
        `Net Margin: ${fmt(d.netMargin)}%`,
        d.netMargin>=20?'High-margin business — strong pricing power or asset-light model.':d.netMargin>=12?'Healthy margins for most sectors.':d.netMargin>=5?'Thin margins — small shocks can hurt profits significantly.':'Very thin margins — high operational fragility.'
      )}
      ${sigrow(d.grossMargin>=50?'✅':d.grossMargin>=30?'🟡':'⚠️',
        `Gross Margin: ${fmt(d.grossMargin)}%`,
        d.grossMargin>=50?'Very high gross margin — likely strong brand or IP-based pricing power.':d.grossMargin>=30?'Reasonable gross margin for the sector.':'Low gross margin — cost-intensive business model.'
      )}
    </div>
  </div>

  ${(d.cfoPATRatio<0.7||d.debtEquity>2)
    ? `<div class="warn-box">⚠️ <strong>Red Flags Detected:</strong>${d.cfoPATRatio<0.7?'<br>• CFO/PAT below 0.7 — earnings quality is questionable':''}${d.debtEquity>2?'<br>• High debt-to-equity — risky balance sheet':''}</div>`
    : `<div class="good-box">✅ <strong>No major accounting red flags.</strong> Financial data appears clean and consistent.</div>`
  }`;

  document.getElementById('tab-financials').innerHTML = H;
}

// ── MOAT ─────────────────────────────────────────────────
function renderMoat() {
  const d = STOCK, a = ANALYSIS;
  const moatColor = a.moatScore>=65?'var(--gold)':a.moatScore>=40?'var(--blue)':'var(--text3)';
  document.getElementById('tab-moat').innerHTML = `
  <div class="sec-title">Moat & Business Quality</div>
  <div class="sec-sub">How durable is the competitive advantage? Can rivals easily replicate this business?</div>

  <div class="g2">
    <div class="card">
      <div class="card-title">Moat Assessment</div>
      <div style="text-align:center;padding:16px 0">
        <div style="font-family:'Playfair Display',serif;font-size:56px;font-weight:900;color:${moatColor};line-height:1">${a.moatScore}</div>
        <div style="font-size:10px;color:var(--text3);margin:4px 0 12px">MOAT SCORE / 100</div>
        <span style="display:inline-block;padding:4px 14px;border-radius:20px;font-size:11px;font-weight:600;background:${a.moatStr==='Wide'?'rgba(201,162,39,.15)':'rgba(59,142,240,.12)'};border:1px solid ${a.moatStr==='Wide'?'var(--gold2)':'rgba(59,142,240,.3)'};color:${a.moatStr==='Wide'?'var(--gold)':'var(--blue)'}">${a.moatStr} Moat</span>
      </div>
      ${sigrow('🏆',`Moat Source: ${a.moatType}`,a.moatStr==='Wide'?'Durable advantage — hard for rivals to replicate within 5–10 years.':a.moatStr==='Narrow'?'Some protection, but advantage could erode in time.':'No clear moat — returns will trend toward average over the long run.')}
      ${sigrow('💰','Pricing Power: '+(a.pricingPow===3?'Strong':a.pricingPow===2?'Moderate':'Weak'),a.pricingPow===3?'Can raise prices without losing customers — classic moat signal.':a.pricingPow===2?'Some pricing flexibility but faces competition on price.':'Price taker — competing mainly on cost.')}
      ${sigrow('🔒','Switching Costs: '+(a.switching===3?'High':a.switching===2?'Medium':'Low'),a.switching===3?'Customers are sticky — time, money or risk makes switching unattractive.':'Customers can easily move to a competitor.')}
    </div>
    <div class="card">
      <div class="card-title">Management Quality — ${a.mgmtScore}/10</div>
      ${srow('Overall Score', a.mgmtScore, 10, 'var(--gold)')}
      ${sigrow(d.promoterHolding>=40?'✅':d.promoterHolding>=20?'🟡':'⚠️',
        `${d.market==='India'?'Promoter':'Insider'} Holding: ${fmt(d.promoterHolding,1)}%`,
        d.promoterHolding>=50?'Strong skin in the game — founders/insiders own a major stake.':d.promoterHolding>=30?'Meaningful insider ownership.':'Low insider ownership — management incentives may not fully align with shareholders.'
      )}
      ${sigrow(d.roe>=20?'✅':d.roe>=12?'🟡':'⚠️',
        `ROE: ${d.roe}%`,
        d.roe>=25?'Exceptional return on equity — management allocates capital very efficiently.':d.roe>=15?'Good ROE — above average capital allocation.':'Below-average ROE. Management may be over-investing with poor returns.'
      )}
      ${sigrow(d.revGrowth3>=10?'✅':d.revGrowth3>=5?'🟡':'⚠️',
        `Revenue Growth Track Record: ${d.revGrowth3}% CAGR`,
        d.revGrowth3>=15?'Strong execution — management has consistently grown the top line.':d.revGrowth3>=8?'Healthy growth delivery.':'Slow growth suggests execution challenges or a maturing market.'
      )}
    </div>
  </div>

  <div class="card">
    <div class="card-title">Business Quality Classification (Buffett Framework)</div>
    <div class="g3">
      <div style="padding:14px;border-radius:8px;background:${a.moatScore>=60&&d.roce>=18?'rgba(0,179,101,.08)':'var(--card2)'};border:1px solid ${a.moatScore>=60&&d.roce>=18?'rgba(0,179,101,.25)':'var(--border)'}">
        <div style="font-weight:600;color:${a.moatScore>=60&&d.roce>=18?'var(--green)':'var(--text3)'};margin-bottom:6px">🌟 Great Business</div>
        <div style="font-family:'Lora',serif;font-size:12px;color:var(--text3)">Durable moat, ROCE >20%, scalable. Compounds for 10+ years.${a.moatScore>=60&&d.roce>=18?' <strong style="color:var(--green)">✓ Matches</strong>':''}</div>
      </div>
      <div style="padding:14px;border-radius:8px;background:${a.moatScore>=35&&a.moatScore<60?'rgba(232,150,26,.08)':'var(--card2)'};border:1px solid ${a.moatScore>=35&&a.moatScore<60?'rgba(232,150,26,.25)':'var(--border)'}">
        <div style="font-weight:600;color:${a.moatScore>=35&&a.moatScore<60?'var(--amber)':'var(--text3)'};margin-bottom:6px">📊 Good Business</div>
        <div style="font-family:'Lora',serif;font-size:12px;color:var(--text3)">Moderate moat, cyclicality. Good returns at the right price.${a.moatScore>=35&&a.moatScore<60?' <strong style="color:var(--amber)">✓ Matches</strong>':''}</div>
      </div>
      <div style="padding:14px;border-radius:8px;background:${a.moatScore<35?'rgba(240,62,62,.06)':'var(--card2)'};border:1px solid ${a.moatScore<35?'rgba(240,62,62,.25)':'var(--border)'}">
        <div style="font-weight:600;color:${a.moatScore<35?'var(--red)':'var(--text3)'};margin-bottom:6px">⚙️ Gruesome Business</div>
        <div style="font-family:'Lora',serif;font-size:12px;color:var(--text3)">Commodity, low margins, high competition. Avoid or trade only.${a.moatScore<35?' <strong style="color:var(--red)">✓ Matches</strong>':''}</div>
      </div>
    </div>
  </div>

  <div class="g2">
    <div class="card">
      <div class="card-title">📈 Weinstein Stage Analysis</div>
      <div style="text-align:center;padding:14px">
        <div style="font-family:'Playfair Display',serif;font-size:28px;font-weight:900;color:${a.weinColor}">${a.weinStage.split(' — ')[0]}</div>
        <div style="font-family:'Lora',serif;font-size:13px;color:var(--text3);margin-top:6px">${a.weinStage.split(' — ')[1]||''}</div>
      </div>
      ${sigrow('📊','Stage Meaning',a.weinStage.includes('2')?'Ideal time to invest — stock is in a confirmed uptrend. Price above 200-day moving average.':a.weinStage.includes('Downtrend')?'Avoid or reduce — stock in a downtrend. Wait for Stage 1 base to form.':'Not yet in uptrend. Can accumulate slowly while waiting for breakout.')}
    </div>
    <div class="card">
      <div class="card-title">Stress Test / Scenario Analysis</div>
      <div class="stress-grid">
        <div class="stress-card" style="border:1px solid rgba(0,179,101,.3);background:rgba(0,179,101,.05)">
          <div class="stress-lbl" style="color:var(--green)">🚀 Bull</div>
          <div class="stress-cagr" style="color:var(--green)">${Math.min(a.cagr3+12,65)}%</div>
          <div class="stress-mult" style="color:var(--green)">${Math.pow(1+(Math.min(a.cagr3+12,65))/100,3).toFixed(1)}x in 3Y</div>
          <div class="stress-note">Accelerating growth, re-rating</div>
        </div>
        <div class="stress-card" style="border:1px solid var(--gold2);background:rgba(201,162,39,.05)">
          <div class="stress-lbl" style="color:var(--gold)">📊 Base</div>
          <div class="stress-cagr" style="color:var(--gold)">${a.cagr3}%</div>
          <div class="stress-mult" style="color:var(--gold)">${Math.pow(1+a.cagr3/100,3).toFixed(1)}x in 3Y</div>
          <div class="stress-note">Current trajectory holds</div>
        </div>
        <div class="stress-card" style="border:1px solid rgba(240,62,62,.3);background:rgba(240,62,62,.04)">
          <div class="stress-lbl" style="color:var(--red)">🐻 Bear</div>
          <div class="stress-cagr" style="color:var(--red)">${Math.max(a.cagr3-18,-15)}%</div>
          <div class="stress-mult" style="color:var(--red)">${Math.pow(1+Math.max(a.cagr3-18,-15)/100,3).toFixed(2)}x in 3Y</div>
          <div class="stress-note">Macro headwinds, execution miss</div>
        </div>
      </div>
    </div>
  </div>`;
}

// ── VALUATION ────────────────────────────────────────────
function renderValuation() {
  const d = STOCK, a = ANALYSIS;
  const industryPE = { 'Technology':30,'Software':35,'Pharmaceuticals':28,'Consumer':38,'Banks':16,
    'Finance':18,'Engineering':28,'Chemicals':24,'Auto':20,'Metals':12,'Infrastructure':20,'Defence':30 };
  const guessIPE = Object.keys(industryPE).find(k=>(d.sector||'').includes(k));
  const ipe = guessIPE ? industryPE[guessIPE] : 25;

  document.getElementById('tab-valuation').innerHTML = `
  <div class="sec-title">Valuation Analysis</div>
  <div class="sec-sub">Is the stock cheap, fair or expensive versus its growth and earning power?</div>

  <div class="kpi-grid">
    ${kpi('P/E Ratio',`${fmt(d.pe,1)}x`,`Industry est. ~${ipe}x`,d.pe<ipe*0.8?'Cheap vs peers':d.pe>ipe*1.3?'Expensive':'',"Price ÷ EPS. Lower = cheaper. Compare to peers. A PE of 20 means you pay ₹20 for every ₹1 of annual profit.")}
    ${kpi('PEG Ratio',`<span style="color:${a.pegR<1?'var(--green)':a.pegR<2?'var(--amber)':'var(--red)'}">${a.pegR>=90?'N/A':a.pegR}</span>`,a.pegR<1?'Undervalued!':a.pegR<2?'Fair':'Expensive',"PEG < 1 = cheap relative to growth. Peter Lynch's favourite metric.")}
    ${kpi('Price to Book',`${fmt(d.pb,2)}x`,d.pb<1.5?'Below book':'Above book',"","")}
    ${kpi('Valuation Verdict',vb(a.valVerdict),'','')}
    ${kpi('3Y Return Est.',`<span style="color:var(--green)">${a.cagr3}% CAGR</span>`,`${a.x5}x in 5 years`,'')}
    ${kpi('10Y Multiple Est.',`<span style="color:var(--gold)">${a.x10}x</span>`,'Compounded at base CAGR','')}
    ${kpi('Analyst Target',d.targetMean>0?`${d.currency}${d.targetMean}`:'-',d.analystCount?`${d.analystCount} analysts · ${d.recKey}`:'','')}
    ${kpi('Graham EPV',a.epv>0?`${d.currency}${a.epv.toLocaleString()} ${d.unit}`:'–','Earnings Power Value',a.epv>0&&a.epv>d.marketCap?'Below EPV — margin of safety':'','')}
  </div>

  <div class="card" style="margin-bottom:14px">
    <div class="card-title">📍 Entry Price Matrix</div>
    <div class="em-grid">
      <div class="em-cell" style="background:rgba(0,179,101,.08);border:1px solid rgba(0,179,101,.25)">
        <div class="em-lbl" style="color:var(--green)">✅ Ideal Entry</div>
        <div class="em-val" style="color:var(--green)">${a.idealPrice>0?`${d.currency}${a.idealPrice.toLocaleString()} or below`:'N/A'}</div>
        <div class="em-desc">Add heavily — maximum margin of safety</div>
      </div>
      <div class="em-cell" style="background:rgba(232,150,26,.08);border:1px solid rgba(232,150,26,.25)">
        <div class="em-lbl" style="color:var(--amber)">🟡 Acceptable</div>
        <div class="em-val" style="color:var(--amber)">${a.idealPrice>0?`${d.currency}${a.idealPrice.toLocaleString()} – ${d.currency}${a.acceptPrice.toLocaleString()}`:'N/A'}</div>
        <div class="em-desc">Buy slowly, average in over time</div>
      </div>
      <div class="em-cell" style="background:rgba(240,62,62,.05);border:1px solid rgba(240,62,62,.25)">
        <div class="em-lbl" style="color:var(--red)">⏸ Wait</div>
        <div class="em-val" style="color:var(--red)">Above ${d.currency}${a.waitPrice.toLocaleString()}</div>
        <div class="em-desc">Valuation stretched — be patient</div>
      </div>
    </div>
    <div style="text-align:center;padding:10px;font-size:13px">
      Current price <strong>${d.currency}${(+d.price).toLocaleString()}</strong> is in the 
      <strong style="color:${a.currentZone==='Ideal'?'var(--green)':a.currentZone==='Acceptable'?'var(--amber)':'var(--red)'}">${a.currentZone}</strong> zone
    </div>
  </div>

  <div class="card">
    <div class="card-title">Graham Defensive Investor Screen — ${a.grahamScore}/7 criteria passed</div>
    ${a.grahamCriteria.map(c=>`
      <div style="display:flex;align-items:center;gap:10px;padding:7px 0;border-bottom:1px solid #0d1018;font-size:13px">
        <span style="font-size:14px">${c.pass?'✅':'❌'}</span>
        <span style="flex:1;font-family:'Lora',serif;color:var(--text3)">${c.label}</span>
        <span style="font-size:11px;font-weight:600;color:${c.pass?'var(--green)':'var(--text3)'}">${c.pass?'Pass':'Fail'}</span>
      </div>`).join('')}
    <div class="note-box" style="margin-top:12px;margin-bottom:0">
      <strong>Graham Score: ${a.grahamScore}/7</strong> — ${a.grahamScore>=5?'Would interest Benjamin Graham. Adequate margin of safety.':a.grahamScore>=3?'Partially meets strict criteria. Suitable for enterprising investors at right price.':'Does not meet defensive criteria. Speculative at current levels.'}
    </div>
  </div>`;
}

// ── FORENSIC ─────────────────────────────────────────────
function renderForensic() {
  const d = STOCK, a = ANALYSIS;
  document.getElementById('tab-forensic').innerHTML = `
  <div class="sec-title">Forensic Accounting & Fraud Check</div>
  <div class="sec-sub">Based on "Financial Shenanigans" by Howard Schilit — detecting accounting tricks</div>

  <div class="heat-grid">
    <div class="heat-cell ${a.fraudLevel==='Low'?'hg':a.fraudLevel==='Medium'?'ha':'hr'}">
      <div class="heat-lbl">Fraud Risk</div>
      <div class="heat-val">${a.fraudLevel}</div>
      <div class="heat-sub">Score: ${a.fraudScore}/10</div>
    </div>
    <div class="heat-cell ${a.accScore>=7?'hg':a.accScore>=5?'ha':'hr'}">
      <div class="heat-lbl">Accounting Quality</div>
      <div class="heat-val">${a.accScore}/10</div>
      <div class="heat-sub">${a.accScore>=7?'Clean':'Review'}</div>
    </div>
    <div class="heat-cell ${d.cfoPATRatio>=0.9?'hg':d.cfoPATRatio>=0.7?'ha':'hr'}">
      <div class="heat-lbl">CFO/PAT</div>
      <div class="heat-val">${fmt(d.cfoPATRatio,2)}</div>
      <div class="heat-sub">Cash conversion</div>
    </div>
    <div class="heat-cell ${d.debtEquity<=0.5?'hg':d.debtEquity<=1.5?'ha':'hr'}">
      <div class="heat-lbl">Debt/Equity</div>
      <div class="heat-val">${fmt(d.debtEquity,2)}x</div>
      <div class="heat-sub">${d.debtEquity<=0.5?'Safe':d.debtEquity<=1.5?'Moderate':'Risky'}</div>
    </div>
    <div class="heat-cell ${d.grossMargin>=30?'hg':d.grossMargin>=15?'ha':'hr'}">
      <div class="heat-lbl">Gross Margin</div>
      <div class="heat-val">${fmt(d.grossMargin)}%</div>
      <div class="heat-sub">Product economics</div>
    </div>
    <div class="heat-cell ${d.interestCoverage>=6?'hg':d.interestCoverage>=3?'ha':'hr'}">
      <div class="heat-lbl">Int. Coverage</div>
      <div class="heat-val">${d.interestCoverage>=99?'Nil':fmt(d.interestCoverage,1)+'x'}</div>
      <div class="heat-sub">${d.interestCoverage>=6?'Safe':'Watch'}</div>
    </div>
  </div>

  <div class="${a.fraudScore>=4?'warn-box':'good-box'}">
    <strong>${a.fraudScore>=4?'⚠️ Forensic Flags Detected':'✅ No Major Forensic Red Flags'}</strong><br>
    ${d.cfoPATRatio<0.7?'• CFO/PAT below 0.7: Profits not converting to cash — check receivables or revenue recognition.<br>':''}
    ${d.debtEquity>2?'• Very high leverage: Debt amplifies downside risk significantly.<br>':''}
    ${a.fraudScore===0?'Cash earnings match reported profit, debt is under control, margins are believable for the sector.':'Review the flagged items above with your own research before making a large investment.'}
  </div>

  <div class="card">
    <div class="card-title">Financial Shenanigans — 7 Key Checks</div>
    ${[
      ['Revenue real?',         d.cfoPATRatio>=0.8, 'Revenue is converting to cash — CFO/PAT is healthy.',     'Profit not matching cash flow. Classic revenue manipulation warning.'],
      ['Costs reported fully?', d.opMargin<50||d.sector?.includes('Tech'), 'EBITDA margin looks realistic for the sector.', 'Very high EBITDA margin warrants checking if costs are being capitalised or deferred.'],
      ['Balance sheet clean?',  d.debtEquity<1,  'Low leverage — strong balance sheet with room to manoeuvre.', 'High debt reduces financial flexibility and increases bankruptcy risk.'],
      ['Cash profits real?',    d.cfoPATRatio>=0.8, 'Cash flow backs up reported earnings.', 'Earnings outpacing cash flow — the classic accounting red flag.'],
      ['Growth sustainable?',   d.revGrowth3>=d.profitGrowth3*0.5, 'Revenue and profit growth are in sync.', 'Profit growing much faster than revenue — one-off gains or understated costs?'],
      ['Insider skin in game?', d.promoterHolding>=30 || d.insiderPct>=5, 'Significant insider ownership — aligned incentives.', 'Low insider holding — management may not share the same risk as shareholders.'],
      ['Debt transparent?',     d.interestCoverage>=4, 'Interest coverage is adequate — visible debt manageable.', 'Low coverage suggests potential hidden liabilities or off-balance sheet obligations.']
    ].map(([t,ok,g,b])=>`
      <div style="display:flex;gap:10px;padding:9px 0;border-bottom:1px solid #0d1018">
        <span style="font-size:15px;flex-shrink:0">${ok?'✅':'⚠️'}</span>
        <div>
          <div style="font-weight:600;font-size:12px;color:var(--text)">${t}</div>
          <div style="font-family:'Lora',serif;font-size:13px;color:var(--text3);margin-top:2px">${ok?g:b}</div>
        </div>
      </div>`).join('')}
  </div>`;
}

// ── FRAMEWORKS ───────────────────────────────────────────
function renderFrameworks() {
  const d = STOCK, a = ANALYSIS;
  const cards = [
    ['🐠','Peter Lynch — '+a.lynchCat,
      a.lynchCat==='Fast Grower'?`Lynch loved fast growers most. Revenue up ${d.revGrowth3}% and profits up ${d.profitGrowth3}% annually. Key question: how long can this pace continue? Lynch wanted: large TAM, clean balance sheet, ROCE above cost of capital.`:
      a.lynchCat==='Stalwart'?`Steady, dependable compounders. Lynch bought stalwarts when temporarily out of favour. Best held 3–5 years. Don't expect 10x, but won't blow up either. Look for P/E below historical average as the entry trigger.`:
      a.lynchCat==='Cyclical'?`Lynch was very careful with cyclicals — buy near cycle lows (paradoxically, when P/E looks HIGH), sell when P/E looks LOW (cycle peak). Worst time to buy is when everyone is optimistic.`:
      a.lynchCat==='Turnaround'?`Turnarounds offer the highest returns if the thesis is right. Lynch's key question: what is the specific catalyst that will fix this business? If you can't answer precisely, avoid.`:
      `Slow growers pay reliable dividends. Lynch only held them for income. Check payout ratio and dividend coverage before buying.`
    ],
    ['🎯','Pat Dorsey — Moat',
      `Moat Score: ${a.moatScore}/100 · ${a.moatStr} Moat<br>${a.moatStr==='Wide'?`Dorsey would approve. ROCE of ${d.roce}% signals durable above-average returns. The moat appears to come from ${a.moatType.toLowerCase()}. Buy at reasonable prices and hold for the full compounding cycle.`:a.moatStr==='Narrow'?`Some competitive protection, but the moat could erode within 10 years. Invest at fair or better prices — don't overpay for a moat that may not last.`:`No meaningful moat detected. Dorsey would not invest at any meaningful premium. Capital returns will trend toward average over time.`}`
    ],
    ['📚','Thomas Phelps — 100-Bagger',
      `Market Cap: ${d.currency}${(+d.marketCap).toLocaleString()} ${d.unit}<br>100x would require: ${d.currency}${(d.marketCap*100).toLocaleString()} ${d.unit}<br><br>${d.marketCap<(d.market==='India'?20000:5000)?`✅ Mathematically possible. Phelps found all 100-baggers shared: (1) founder with skin in game, (2) large TAM, (3) 20%+ earnings growth for 15+ years. The biggest enemy of 100-bagger returns is selling too early after a 2-3x gain.`:`At this market cap, 100x may be unrealistic. Target 10–20x over 10 years as a more realistic compounding goal.`}`
    ],
    ['🛡️','Benjamin Graham — Safety',
      `Graham Score: ${a.grahamScore}/7 criteria<br><br>${a.grahamScore>=5?`Passes Graham's defensive screen. An adequate margin of safety exists. Conservative investors can proceed with appropriate position sizing.`:a.grahamScore>=3?`Partially meets criteria. Too speculative for conservative investors but workable for enterprising investors who've done deep research.`:`Does not pass defensive screen. Without margin of safety, you are speculating on growth — which Graham considered gambling, not investing.`}`
    ],
    ['⚖️','Howard Marks — Market Cycle',
      d.revGrowth3>20&&d.pe>d.pe*1.4?`🔴 Late cycle caution: Strong growth + high valuation = euphoric pricing. Marks' warning: "The seeds of loss are sown during good times." Trim, don't add aggressively here.`:
      d.revGrowth3>12&&d.pe<(d.pe*1.1)?`🟢 Sweet spot: Good growth at reasonable valuation. The market may be ignoring this because it's not exciting enough — that's exactly where Marks finds opportunities.`:
      d.revGrowth3<3?`🟢 Pessimistic pricing. If the fundamental thesis is intact and this is a temporary slowdown, Marks would say: "Invest most aggressively when others are most fearful."`:
      `🟡 Mixed signals. Marks would say: first know where you are in the cycle, then determine position size. Don't let macro views override stock-specific work.`
    ],
    ['🦓','Ralph Wanger — Small Pond',
      `${d.marketCap<(d.market==='India'?5000:1000)?`✅ Small enough for the institutional neglect premium. Large funds cannot own this stock due to size — creating a structural information advantage for patient retail investors. Wanger found dominant niche players below the radar consistently outperformed.`:`At this size, major institutions already own it. Wanger's "small pond" structural edge is less applicable. The stock can still be excellent, but the price discovery edge is gone.`} ${d.instPct?`Institutional ownership: ${d.instPct}%`:''}`
    ]
  ];

  document.getElementById('tab-frameworks').innerHTML = `
  <div class="sec-title">Legendary Investor Frameworks</div>
  <div class="sec-sub">How the world's greatest investors would assess ${d.name}</div>
  <div class="fw-grid">
    ${cards.map(c=>`<div class="fw-card"><div class="fw-icon">${c[0]}</div><div class="fw-name">${c[1]}</div><div class="fw-body">${c[2]}</div></div>`).join('')}
  </div>
  <div class="card">
    <div class="card-title">🚨 Sell Triggers — When to Exit ${d.name}</div>
    ${[
      `ROCE drops below 15% for 2 consecutive years (business quality deterioration)`,
      `Revenue growth falls below 8% with no clear recovery catalyst in sight`,
      `Debt/Equity crosses ${Math.max(d.debtEquity*2, 1).toFixed(1)}x without a compelling strategic reason`,
      `CFO/PAT falls below 0.6x for 3 consecutive quarters`,
      `P/E re-rates above ${Math.round(d.pe*1.6)}x without a matching acceleration in earnings growth`,
      `Auditor resignation, qualified audit opinion, or restatement of financials`,
      `Founder/key promoter unexpectedly sells large stake or exits the business`,
      `Thesis-breaking regulatory change or loss of major customer/contract`
    ].map(t=>`<div style="display:flex;gap:8px;padding:7px 0;border-bottom:1px solid #0d1018;font-size:13px;font-family:'Lora',serif;color:var(--text3)"><span style="color:var(--red);font-size:11px;margin-top:1px">⛔</span>${t}</div>`).join('')}
  </div>`;
}

// ── FINAL VERDICT ────────────────────────────────────────
function renderVerdict() {
  const d = STOCK, a = ANALYSIS;
  const bull = Math.min(a.cagr3+12, 65), bear = Math.max(a.cagr3-18, -15);
  document.getElementById('tab-verdict').innerHTML = `
  <div class="sec-title">Final Investment Verdict</div>
  <div class="sec-sub">Everything distilled into one clear, actionable recommendation</div>

  <div class="verdict-hero">
    <div class="vh-left">
      <div class="vh-eyebrow">Verdict for ${d.name}</div>
      <div class="vh-word" style="color:${a.verdictColor}">${a.verdict}</div>
      <div style="margin-bottom:12px">${allocBadge(a.allocType,a.allocPct)}</div>
      <div class="vh-explain">${genRationale(d,a)}</div>
    </div>
    <div class="vh-scores">
      <div class="vsc"><div class="vsc-num" style="color:var(--gold)">${a.convScore}</div><div class="vsc-lbl">Conviction</div></div>
      <div class="vsc"><div class="vsc-num" style="color:var(--gold)">${a.moatScore}</div><div class="vsc-lbl">Moat</div></div>
      <div class="vsc"><div class="vsc-num" style="color:var(--green)">${a.cagr3}%</div><div class="vsc-lbl">3Y CAGR est.</div></div>
      <div class="vsc"><div class="vsc-num" style="color:var(--blue)">${a.x5}x</div><div class="vsc-lbl">5Y Multiple</div></div>
    </div>
  </div>

  <div class="stress-grid">
    <div class="stress-card" style="border:1px solid rgba(0,179,101,.3);background:rgba(0,179,101,.05)">
      <div class="stress-lbl" style="color:var(--green)">🚀 Bull Case</div>
      <div class="stress-cagr" style="color:var(--green)">${bull}% CAGR</div>
      <div class="stress-mult" style="color:var(--green)">${Math.pow(1+bull/100,3).toFixed(1)}x in 3 years</div>
      <div class="stress-note">Growth accelerates, industry tailwinds materialize, valuation re-rates upward</div>
    </div>
    <div class="stress-card" style="border:1px solid var(--gold2);background:rgba(201,162,39,.05)">
      <div class="stress-lbl" style="color:var(--gold)">📊 Base Case</div>
      <div class="stress-cagr" style="color:var(--gold)">${a.cagr3}% CAGR</div>
      <div class="stress-mult" style="color:var(--gold)">${Math.pow(1+a.cagr3/100,3).toFixed(1)}x in 3 years</div>
      <div class="stress-note">Business grows at current trajectory. No major surprises.</div>
    </div>
    <div class="stress-card" style="border:1px solid rgba(240,62,62,.3);background:rgba(240,62,62,.04)">
      <div class="stress-lbl" style="color:var(--red)">🐻 Bear Case</div>
      <div class="stress-cagr" style="color:var(--red)">${bear}% CAGR</div>
      <div class="stress-mult" style="color:var(--red)">${Math.pow(1+bear/100,3).toFixed(2)}x in 3 years</div>
      <div class="stress-note">Macro headwinds, competition increases, management execution fails</div>
    </div>
  </div>

  <div class="tbl-wrap">
    <table>
      <thead><tr><th>Framework</th><th>Score</th><th>Signal</th><th>Plain English</th></tr></thead>
      <tbody>
        ${[
          ['Moat Score',        a.moatScore+'/100', a.moatScore>=65?'🟢':a.moatScore>=40?'🟡':'🔴', `${a.moatStr} moat — ${a.moatType.toLowerCase()}`],
          ["Porter's Forces",   a.portersTotal+'/50', a.portersTotal>=35?'🟢':a.portersTotal>=25?'🟡':'🔴', 'Industry competitive attractiveness'],
          ['Accounting Quality',a.accScore+'/10',  a.accScore>=7?'🟢':a.accScore>=5?'🟡':'🔴', a.accScore>=7?'Books are clean, earnings are real':'Some flags warrant monitoring'],
          ['Management',        a.mgmtScore+'/10', a.mgmtScore>=7?'🟢':a.mgmtScore>=5?'🟡':'🔴', a.mgmtScore>=7?'Strong alignment, good track record':'Adequate, not exceptional'],
          ['Fraud Risk',        a.fraudLevel,      a.fraudLevel==='Low'?'🟢':a.fraudLevel==='Medium'?'🟡':'🔴', a.fraudLevel==='Low'?'No major red flags':'Review flagged items'],
          ['Valuation',         a.valVerdict,      a.valVerdict==='Undervalued'?'🟢':a.valVerdict==='Fairly Valued'?'🟡':'🔴', a.valVerdict==='Undervalued'?'Cheap vs growth rate':'Price reflects current expectations'],
          ['Overall Conviction',a.convScore+'/100',a.convScore>=65?'🟢':a.convScore>=45?'🟡':'🔴', a.verdict+' — '+a.allocPct+' portfolio allocation']
        ].map(([l,s,ic,e])=>`<tr>
          <td style="font-weight:600">${l}</td>
          <td style="color:var(--gold);font-weight:700">${s}</td>
          <td>${ic}</td>
          <td style="font-family:'Lora',serif;color:var(--text3);font-size:13px">${e}</td>
        </tr>`).join('')}
      </tbody>
    </table>
  </div>

  <div class="note-box">
    <strong>⚠️ Disclaimer:</strong> StockSage is for educational purposes only. Analysis is computed from publicly available data and does not constitute financial advice. Always do your own research and consult a registered financial advisor before investing. Never invest money you cannot afford to lose.
  </div>`;
}

// ── EXPORT ───────────────────────────────────────────────
function exportReport() {
  if (!STOCK) return;
  const panes = document.querySelectorAll('.tab-pane');
  let allContent = '';
  panes.forEach(p => { allContent += p.innerHTML; });

  const html = `<!DOCTYPE html><html><head>
<meta charset="UTF-8">
<title>${STOCK.name} — StockSage Analysis</title>
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;0,900;1,700&family=DM+Mono:wght@300;400;500&family=Lora:ital,wght@0,400;0,600;1,400&display=swap" rel="stylesheet">
<style>${document.querySelector('link[rel="stylesheet"]') ? '' : ''}
${Array.from(document.styleSheets).map(s=>{try{return Array.from(s.cssRules).map(r=>r.cssText).join('\n')}catch{return ''}}).join('\n')}
body{background:#08090c;color:#ddd5bb;font-family:'DM Mono',monospace;padding:40px;max-width:1100px;margin:0 auto}
.tab-pane{display:block!important;margin-bottom:60px;border-bottom:1px solid #1c2535;padding-bottom:40px}
</style></head><body>
<div style="font-family:'Playfair Display',serif;font-size:32px;font-weight:900;color:#c9a227;margin-bottom:8px">${STOCK.name} (${STOCK.symbol})</div>
<div style="font-size:12px;color:#8a9aaa;margin-bottom:40px">${STOCK.exchange} · ${STOCK.sector||''} · Report generated ${new Date().toLocaleString()}</div>
${document.getElementById('stockHeader').innerHTML}
${allContent}
</body></html>`;

  const blob = new Blob([html], { type: 'text/html' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `${STOCK.symbol}_StockSage_${new Date().toISOString().slice(0,10)}.html`;
  a.click();
}
