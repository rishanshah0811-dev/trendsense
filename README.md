# TrendSense

An ML-powered trading signal analyser that generates buy, sell, and neutral signals for any stock ticker using an XGBoost classifier with probability thresholding.

## What it does

I built TrendSense to answer a straightforward question: can a machine learning model trained on technical indicators produce trading signals with any predictive edge? The answer, based on my testing across dozens of tickers, is "sometimes" -- which is more honest than most tools in this space will tell you.

Enter a ticker symbol, and TrendSense runs a full ML pipeline: it fetches 3 years of daily OHLCV data, computes 23 technical indicators, finds the optimal labeling configuration through grid search, trains an XGBoost classifier with hyperparameter tuning, and generates trading signals using probability thresholding rather than hard classification.

The key insight behind probability thresholding: instead of asking "is this a buy?" (binary), I ask "how confident is the model that this is a buy?" and only emit a signal when confidence exceeds a user-defined threshold. This dramatically improves precision at the cost of fewer total signals -- a tradeoff that matters in real trading.

## ML methodology

**Labeling**: I use a three-class label (ranging, downtrend, uptrend) based on the average closing price of the next N candles compared to the current price. The "look-ahead" window and percentage threshold are selected through grid search over 10 combinations, optimizing for F1 macro score on the test set.

**Features**: 23 technical indicators computed via pandas_ta:
- Momentum: RSI (5, 10, 15), ROC 10, Momentum 10, CCI 20, Williams %R 14
- Trend: MACD (line, signal, histogram), SMA (5, 10, 20), EMA (5, 10, 20)
- Volume: VWMA 20, NVI, OBV
- Volatility: ATR 14, Bollinger Bands (upper, middle, lower)

These indicators were chosen to cover the four major categories of technical analysis. The model sees momentum, trend direction, volume confirmation, and volatility regime simultaneously.

**Model**: XGBoost classifier with grid search over n_estimators, max_depth, learning_rate, and subsample using 3-fold cross-validation. Data is split chronologically (60/20/20 train/test/validation) to prevent look-ahead bias.

**Signal generation**: `predict_proba()` outputs are filtered through separate bullish and bearish confidence thresholds (adjustable from 40-75%). Only signals exceeding the threshold are emitted. This produces fewer but more reliable signals.

**Evaluation**: accuracy, F1 macro, per-class precision/recall, ROC curves with AUC for all three classes, and SHAP feature importance to show which indicators actually drive predictions.

## Limitations

Model accuracy typically falls between 52-76% on unseen data. That is above random (33% for three classes) but not a guaranteed trading signal. Past performance of the model does not predict future results.

This is a research and analysis tool, not financial advice. Do not trade based solely on these signals. The model trains on historical data and cannot account for fundamental changes, news events, or market regime shifts.

## Tech stack

- **Backend**: Python, FastAPI, yfinance, pandas_ta, XGBoost, scikit-learn, SHAP
- **Frontend**: Next.js 15, TypeScript, Tailwind CSS, lightweight-charts (TradingView), Recharts
- **Deployment**: Railway (backend), Vercel (frontend)

## Live demo

- **Frontend**: [trendsense-iota.vercel.app](https://trendsense-iota.vercel.app)
- **Backend API**: [trendsense-production.up.railway.app](https://trendsense-production.up.railway.app/health)

Enter a ticker, and run the analysis. The pipeline takes 2-4 minutes depending on the grid search.

## Local setup

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install
echo "NEXT_PUBLIC_API_URL=http://localhost:8000" > .env.local
npm run dev
```

Open http://localhost:3000 to use the app locally.
