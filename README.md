# StockSage — Free Stock Analyzer

**Type any ticker. Get institutional-grade analysis. Free forever.**

![StockSage](https://img.shields.io/badge/StockSage-Free-00b365?style=flat-square)
![Node](https://img.shields.io/badge/Node.js-16%2B-339933?style=flat-square)
![License](https://img.shields.io/badge/License-MIT-blue?style=flat-square)

---

## What It Does

Type `RELIANCE`, `CDSL`, `AAPL`, or `NVDA` — StockSage fetches live data from Yahoo Finance and runs it through **59 analytical frameworks** from legendary investors:

- **Pat Dorsey** — Moat Analysis (scored /100)
- **Peter Lynch** — Stock Classification (Fast Grower / Stalwart / Cyclical…)
- **Thomas Phelps** — 100-Bagger Criteria
- **Benjamin Graham** — Defensive Screen & Earnings Power Value
- **Howard Marks** — Market Cycle Positioning
- **Ralph Wanger** — Small Pond / Neglected Niche Screen
- **Stan Weinstein** — Stage Analysis
- Plus: Porter's Five Forces, DuPont, Forensic Accounting, Financial Shenanigans

**Output:** 7-tab interactive report with plain-language explanations, exportable as HTML/PDF.

---

## Setup (3 steps)

### Prerequisites
- [Node.js](https://nodejs.org) v16 or higher (free)
- Internet connection (fetches live data from Yahoo Finance)

### Step 1 — Clone / Download

```bash
# Option A: Clone with git
git clone https://github.com/YOUR_USERNAME/stocksage.git
cd stocksage

# Option B: Download ZIP from GitHub → extract → open folder in terminal
```

### Step 2 — Install

```bash
npm install
```

### Step 3 — Run

```bash
npm start
```

Then open **http://localhost:3000** in your browser.

That's it. Type any stock ticker and click Analyze.

---

## Usage

### Indian Stocks (NSE/BSE)
Type the NSE ticker exactly as listed:
```
RELIANCE    TCS         INFY        HDFC        WIPRO
CDSL        DIXON       NESTLEIND   BAJFINANCE  TITAN
COALINDIA   POWERGRID   ADANIENT    ZOMATO      PAYTM
```

### US Stocks (NASDAQ/NYSE)
```
AAPL    NVDA    MSFT    GOOGL   AMZN
META    TSLA    BRK.B   JPM     WMT
```

### Tips
- The search box has autocomplete — start typing a company name and suggestions appear
- If a ticker isn't found, try adding `.NS` (NSE) or `.BO` (BSE) suffix for Indian stocks
- Use the **Export HTML** button to save a full report you can share

---

## Project Structure

```
stocksage/
├── server.js          ← Express server + Yahoo Finance API proxy
├── package.json       ← Dependencies (just Express + node-fetch)
├── public/
│   ├── index.html     ← App shell (search, tabs, layout)
│   ├── style.css      ← Complete dark theme styling
│   └── app.js         ← Analysis engine + all render functions
└── README.md
```

---

## How It Works

1. **Backend (server.js):** Node.js Express server fetches data from Yahoo Finance's `quoteSummary` API — this runs server-side so there are no CORS issues. Returns clean normalised JSON to the browser.

2. **Frontend (app.js):** Pure vanilla JS (no frameworks). Receives the JSON, runs the 59-framework analysis engine entirely in the browser, and renders the 7-tab report.

3. **Data source:** Yahoo Finance (free, no API key needed). Covers 50,000+ stocks globally including NSE, BSE, NYSE, NASDAQ, LSE, and more.

---

## Deploy to the Cloud (Free)

### Railway (recommended, free tier)
1. Push to GitHub
2. Go to [railway.app](https://railway.app) → New Project → Deploy from GitHub
3. Select your repo → Railway auto-detects Node.js → Deploy
4. Your app is live at `https://your-app.railway.app`

### Render (free tier)
1. Go to [render.com](https://render.com) → New Web Service
2. Connect GitHub repo
3. Build command: `npm install`
4. Start command: `npm start`
5. Free URL provided automatically

### Heroku
```bash
heroku create your-stocksage-app
git push heroku main
heroku open
```

---

## Cost

**$0.** StockSage uses Yahoo Finance's free public API. No API keys. No subscriptions. No usage limits for personal use.

---

## Disclaimer

StockSage is for **educational purposes only**. The analysis is computed from publicly available data and does not constitute financial advice. Always do your own research and consult a SEBI-registered / SEC-registered financial advisor before investing. Never invest money you cannot afford to lose.

---

## License

MIT — free to use, modify, and distribute.
