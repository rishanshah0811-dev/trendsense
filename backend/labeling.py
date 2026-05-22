import pandas as pd
import numpy as np
from xgboost import XGBClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import f1_score

from indicators import FEATURE_COLUMNS


def generate_label(df: pd.DataFrame, look_ahead: int, threshold: float) -> pd.Series:
    future_avg = df["Close"].rolling(window=look_ahead).mean().shift(-look_ahead)
    current = df["Close"]

    labels = pd.Series(0, index=df.index, dtype=int)
    labels[future_avg > current * (1 + threshold)] = 2
    labels[future_avg < current * (1 - threshold)] = 1
    labels[future_avg.isna()] = np.nan

    return labels


def select_best_label(df: pd.DataFrame) -> dict:
    look_ahead_values = [2, 4, 6, 8, 10]
    threshold_values = [0.01, 0.02]

    best_f1 = -1
    best_config = None
    best_labels = None

    features = [c for c in FEATURE_COLUMNS if c in df.columns]

    for la in look_ahead_values:
        for th in threshold_values:
            labels = generate_label(df, la, th)
            temp = df.copy()
            temp["label"] = labels
            temp = temp.dropna(subset=["label"])
            temp["label"] = temp["label"].astype(int)

            if len(temp) < 100:
                continue

            X = temp[features]
            y = temp["label"]

            if y.nunique() < 2:
                continue

            X_train, X_test, y_train, y_test = train_test_split(
                X, y, test_size=0.2, shuffle=False
            )

            clf = XGBClassifier(
                n_estimators=100,
                max_depth=3,
                learning_rate=0.1,
                use_label_encoder=False,
                eval_metric="mlogloss",
                verbosity=0,
                random_state=42,
            )
            clf.fit(X_train, y_train)
            preds = clf.predict(X_test)
            f1 = f1_score(y_test, preds, average="macro", zero_division=0)

            if f1 > best_f1:
                best_f1 = f1
                best_config = {"look_ahead": la, "threshold": th}
                best_labels = labels

    if best_config is None:
        best_config = {"look_ahead": 4, "threshold": 0.02}
        best_labels = generate_label(df, 4, 0.02)

    return {
        "config": best_config,
        "labels": best_labels,
        "baseline_f1": round(best_f1, 4),
    }
