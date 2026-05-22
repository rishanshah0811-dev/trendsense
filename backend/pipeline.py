import json
import asyncio
import time
import yfinance as yf
import pandas as pd
import numpy as np
from concurrent.futures import ThreadPoolExecutor
from sklearn.model_selection import train_test_split

from indicators import add_indicators, FEATURE_COLUMNS, INDICATOR_CATEGORIES
from labeling import select_best_label, generate_label
from model import train_model, evaluate_model, compute_shap, generate_signals


_executor = ThreadPoolExecutor(max_workers=2)


def sse_event(stage, message, progress, data=None, error=None):
    payload = {"stage": stage, "message": message, "progress": progress}
    if data is not None:
        payload["data"] = data
    if error is not None:
        payload["error"] = error
    return f"data: {json.dumps(payload, default=str)}\n\n"


def _fetch_data(ticker, start_date, end_date):
    retries = 0
    while retries < 3:
        try:
            raw = yf.download(ticker, start=start_date, end=end_date, progress=False)
            if raw is not None and len(raw) > 0:
                return raw.copy()
        except Exception:
            pass
        retries += 1
        time.sleep(2 ** retries)
    return None


def _run_indicators(df):
    return add_indicators(df)


def _run_label_search(df):
    return select_best_label(df)


def _run_training(X_train, y_train):
    return train_model(X_train, y_train)


def _run_evaluation(model, X_test, y_test, X_val, y_val):
    return evaluate_model(model, X_test, y_test, X_val, y_val)


def _run_shap(model, X_train, available_features):
    return compute_shap(model, X_train, available_features)


def _run_signals(model, df_labeled, available_features, bullish_threshold, bearish_threshold, look_ahead):
    return generate_signals(model, df_labeled, available_features, bullish_threshold, bearish_threshold, look_ahead)


async def run_pipeline(ticker: str, start_date: str, end_date: str,
                       bullish_threshold: float = 0.55, bearish_threshold: float = 0.55):
    loop = asyncio.get_event_loop()

    yield sse_event(1, f"Fetching price data for {ticker}...", 5)
    await asyncio.sleep(0)

    df = await loop.run_in_executor(_executor, _fetch_data, ticker, start_date, end_date)

    if df is None or len(df) == 0:
        yield sse_event(1, "Failed to fetch data", 0, error=f"Could not fetch data for {ticker}. Verify the ticker is valid.")
        return

    if hasattr(df.columns, "levels") and df.columns.nlevels > 1:
        df.columns = df.columns.get_level_values(0)

    df = df.reset_index()
    if "Date" in df.columns:
        df["Date"] = pd.to_datetime(df["Date"]).dt.tz_localize(None)

    if len(df) < 500:
        yield sse_event(1, "Insufficient data", 0,
                        error="Not enough historical data for this ticker. Try a different ticker or extend the date range.")
        return

    yield sse_event(1, f"Fetched {len(df)} candles", 12)
    await asyncio.sleep(0)

    yield sse_event(2, f"Computing {len(FEATURE_COLUMNS)} technical indicators...", 18)
    await asyncio.sleep(0)

    df = await loop.run_in_executor(_executor, _run_indicators, df)
    available_features = [c for c in FEATURE_COLUMNS if c in df.columns]

    yield sse_event(2, f"Computed {len(available_features)} indicators", 25)
    await asyncio.sleep(0)

    yield sse_event(3, "Running label grid search (10 combinations)...", 30)
    await asyncio.sleep(0)

    label_result = await loop.run_in_executor(_executor, _run_label_search, df)
    best_config = label_result["config"]

    labels = generate_label(df, best_config["look_ahead"], best_config["threshold"])
    df["label"] = labels
    df_labeled = df.dropna(subset=["label"]).copy()
    df_labeled["label"] = df_labeled["label"].astype(int)

    yield sse_event(3, f"Best config: look_ahead={best_config['look_ahead']}, threshold={best_config['threshold']}", 40)
    await asyncio.sleep(0)

    yield sse_event(4, "Training XGBoost with hyperparameter search...", 45)
    await asyncio.sleep(0)

    X = df_labeled[available_features]
    y = df_labeled["label"]

    split1 = int(len(X) * 0.6)
    split2 = int(len(X) * 0.8)

    X_train, y_train = X.iloc[:split1], y.iloc[:split1]
    X_test, y_test = X.iloc[split1:split2], y.iloc[split1:split2]
    X_val, y_val = X.iloc[split2:], y.iloc[split2:]

    model, best_params = await loop.run_in_executor(_executor, _run_training, X_train, y_train)

    yield sse_event(4, "XGBoost training complete", 65)
    await asyncio.sleep(0)

    yield sse_event(5, "Evaluating model performance...", 70)
    await asyncio.sleep(0)

    metrics = await loop.run_in_executor(_executor, _run_evaluation, model, X_test, y_test, X_val, y_val)

    yield sse_event(5, f"Test accuracy: {metrics['test_accuracy']}", 75)
    await asyncio.sleep(0)

    yield sse_event(6, "Computing SHAP feature importance...", 78)
    await asyncio.sleep(0)

    shap_importance = await loop.run_in_executor(_executor, _run_shap, model, X_train, available_features)
    for item in shap_importance:
        item["category"] = INDICATOR_CATEGORIES.get(item["feature"], "other")

    yield sse_event(6, "SHAP analysis complete", 85)
    await asyncio.sleep(0)

    yield sse_event(7, "Generating trading signals...", 88)
    await asyncio.sleep(0)

    signals, raw_probas = await loop.run_in_executor(
        _executor, _run_signals, model, df_labeled, available_features,
        bullish_threshold, bearish_threshold, best_config["look_ahead"]
    )

    buy_signals = [s for s in signals if s["signal_type"] == "BUY"]
    sell_signals = [s for s in signals if s["signal_type"] == "SELL"]
    correct = [s for s in signals if s["outcome"] == "correct"]
    total = [s for s in signals if s["outcome"] in ("correct", "incorrect")]
    win_rate = round(len(correct) / len(total), 4) if total else 0
    avg_conf = round(np.mean([s["confidence"] for s in signals]), 4) if signals else 0

    yield sse_event(7, f"Generated {len(signals)} signals", 95)
    await asyncio.sleep(0)

    candles = []
    for _, row in df.iterrows():
        date_val = row.get("Date", "")
        if hasattr(date_val, "isoformat"):
            d = date_val.isoformat()[:10]
        else:
            d = str(date_val)[:10]
        candles.append({
            "time": d,
            "open": round(float(row["Open"]), 2),
            "high": round(float(row["High"]), 2),
            "low": round(float(row["Low"]), 2),
            "close": round(float(row["Close"]), 2),
        })

    proba_list = []
    for i, rp in enumerate(raw_probas):
        date_val = df_labeled.iloc[i].get("Date", df_labeled.index[i])
        if hasattr(date_val, "isoformat"):
            d = date_val.isoformat()[:10]
        else:
            d = str(date_val)[:10]
        proba_list.append({
            "date": d,
            "price": round(float(df_labeled["Close"].iloc[i]), 2),
            "bullish_prob": rp["bullish_prob"],
            "bearish_prob": rp["bearish_prob"],
            "index": i,
        })

    results = {
        "ticker": ticker,
        "date_range": {"start": start_date, "end": end_date},
        "candles": candles,
        "signals": signals,
        "raw_probas": proba_list,
        "best_label_config": best_config,
        "best_params": best_params,
        "metrics": metrics,
        "shap_importance": shap_importance,
        "signal_summary": {
            "total_signals": len(signals),
            "buy_signals": len(buy_signals),
            "sell_signals": len(sell_signals),
            "correct_signals": len(correct),
            "win_rate": win_rate,
            "avg_confidence": avg_conf,
        },
        "look_ahead": best_config["look_ahead"],
    }

    yield sse_event(8, "Complete", 100, data=results)
