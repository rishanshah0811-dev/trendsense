import pandas as pd
import pandas_ta as ta
import numpy as np


def add_indicators(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()

    df["RSI_5"] = ta.rsi(df["Close"], length=5)
    df["RSI_10"] = ta.rsi(df["Close"], length=10)
    df["RSI_15"] = ta.rsi(df["Close"], length=15)

    df["ROC_10"] = ta.roc(df["Close"], length=10)
    df["MOM_10"] = ta.mom(df["Close"], length=10)
    df["CCI_20"] = ta.cci(df["High"], df["Low"], df["Close"], length=20)
    df["WILLR_14"] = ta.willr(df["High"], df["Low"], df["Close"], length=14)

    macd = ta.macd(df["Close"])
    if macd is not None:
        df["MACD"] = macd.iloc[:, 0]
        df["MACD_signal"] = macd.iloc[:, 1]
        df["MACD_hist"] = macd.iloc[:, 2]

    df["SMA_5"] = ta.sma(df["Close"], length=5)
    df["SMA_10"] = ta.sma(df["Close"], length=10)
    df["SMA_20"] = ta.sma(df["Close"], length=20)

    df["EMA_5"] = ta.ema(df["Close"], length=5)
    df["EMA_10"] = ta.ema(df["Close"], length=10)
    df["EMA_20"] = ta.ema(df["Close"], length=20)

    df["VWMA_20"] = ta.vwma(df["Close"], df["Volume"], length=20)

    nvi = ta.nvi(df["Close"], df["Volume"])
    if nvi is not None:
        df["NVI"] = nvi
    else:
        df["NVI"] = 1000.0

    df["ATR_14"] = ta.atr(df["High"], df["Low"], df["Close"], length=14)

    bbands = ta.bbands(df["Close"], length=20)
    if bbands is not None:
        df["BB_lower"] = bbands.iloc[:, 0]
        df["BB_middle"] = bbands.iloc[:, 1]
        df["BB_upper"] = bbands.iloc[:, 2]

    df["OBV"] = ta.obv(df["Close"], df["Volume"])

    df.dropna(inplace=True)
    df.reset_index(drop=True, inplace=True)

    return df


FEATURE_COLUMNS = [
    "RSI_5", "RSI_10", "RSI_15",
    "ROC_10", "MOM_10", "CCI_20", "WILLR_14",
    "MACD", "MACD_signal", "MACD_hist",
    "SMA_5", "SMA_10", "SMA_20",
    "EMA_5", "EMA_10", "EMA_20",
    "VWMA_20", "NVI",
    "ATR_14",
    "BB_lower", "BB_middle", "BB_upper",
    "OBV",
]

INDICATOR_CATEGORIES = {
    "RSI_5": "momentum", "RSI_10": "momentum", "RSI_15": "momentum",
    "ROC_10": "momentum", "MOM_10": "momentum",
    "CCI_20": "momentum", "WILLR_14": "momentum",
    "MACD": "trend", "MACD_signal": "trend", "MACD_hist": "trend",
    "SMA_5": "trend", "SMA_10": "trend", "SMA_20": "trend",
    "EMA_5": "trend", "EMA_10": "trend", "EMA_20": "trend",
    "VWMA_20": "volume", "NVI": "volume", "OBV": "volume",
    "ATR_14": "volatility",
    "BB_lower": "volatility", "BB_middle": "volatility", "BB_upper": "volatility",
}
