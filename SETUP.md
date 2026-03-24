# 🚀 Getting Started with StockSage

## Setup Instructions

### 1. Get a Free Finnhub API Key
StockSage uses **Finnhub** for real stock data. It's completely free!

1. Go to: https://finnhub.io/
2. Click "Get Free API Key"
3. Sign up (takes 2 minutes)
4. Copy your API key

### 2. Configure Your API Key
Edit the `.env` file in the `stocksage` folder:

```
FINNHUB_API_KEY=your_api_key_here
PORT=3000
```

Replace `your_api_key_here` with your actual key from Finnhub.

### 3. Install & Run

```bash
npm install
npm start
```

Then open: **http://localhost:3000**

## Features

✨ **59 Analytical Frameworks**
- Pat Dorsey's Moat Analysis
- Peter Lynch's Stock Classification
- Benjamin Graham's Defensive Screen
- Howard Marks' Market Cycle Positioning
- And 55 more!

📊 **Real-Time Data**
- Live stock quotes
- Financial statements
- Valuation metrics
- Analyst ratings

📥 **Export Your Report**
- Download as HTML
- Print to PDF
- Share with others

## Without an API Key?

The app falls back to **realistic demo data**, so you can still:
- Test the interface
- Explore all 59 frameworks
- See how the analysis works

When you add your real API key, you get **actual stock data**.

## Supported Markets

- 🇺🇸 **US Stocks**: AAPL, NVDA, MSFT, TSLA, etc.
- 🇮🇳 **Indian Stocks**: RELIANCE, CDSL, TCS, INFY, etc. (use .NS or .BO suffix)
- 🌍 **International**: Thousands of global stocks

## Troubleshooting

**"Invalid API key" message?**
- Double-check your key in `.env` file
- Make sure there are no extra spaces
- Restart the server: `npm start`

**Need help?**
- Finnhub support: https://finnhub.io/
- Check `.env.example` for format

Enjoy analyzing stocks with StockSage! 📈
