import numpy as np
import pandas as pd
from xgboost import XGBClassifier
from sklearn.model_selection import GridSearchCV
from sklearn.metrics import (
    accuracy_score,
    f1_score,
    classification_report,
    roc_curve,
    auc,
)
from sklearn.preprocessing import label_binarize
import shap


def train_model(X_train, y_train):
    param_grid = {
        "n_estimators": [100, 200, 400],
        "max_depth": [3, 5, 7],
        "learning_rate": [0.05, 0.1],
        "subsample": [0.8, 1.0],
    }

    base = XGBClassifier(
        use_label_encoder=False,
        eval_metric="mlogloss",
        verbosity=0,
        random_state=42,
    )

    grid = GridSearchCV(
        base,
        param_grid,
        cv=3,
        scoring="f1_macro",
        n_jobs=-1,
        verbose=0,
    )
    grid.fit(X_train, y_train)

    return grid.best_estimator_, grid.best_params_


def evaluate_model(model, X_test, y_test, X_val, y_val):
    test_preds = model.predict(X_test)
    val_preds = model.predict(X_val)

    classes = sorted(list(set(y_test.unique()) | set(y_val.unique())))
    target_names = ["Ranging", "Bearish", "Bullish"]
    labels_present = [c for c in [0, 1, 2] if c in classes]

    report = classification_report(
        y_test, test_preds,
        labels=labels_present,
        target_names=[target_names[i] for i in labels_present],
        output_dict=True,
        zero_division=0,
    )

    roc_data = {}
    y_test_bin = label_binarize(y_test, classes=[0, 1, 2])
    test_proba = model.predict_proba(X_test)

    for i, cls_name in enumerate(["class_0", "class_1", "class_2"]):
        if i < y_test_bin.shape[1] and i < test_proba.shape[1]:
            fpr, tpr, _ = roc_curve(y_test_bin[:, i], test_proba[:, i])
            roc_auc = auc(fpr, tpr)
            roc_data[cls_name] = {
                "fpr": fpr.tolist(),
                "tpr": tpr.tolist(),
                "auc": round(roc_auc, 4),
            }

    return {
        "test_accuracy": round(accuracy_score(y_test, test_preds), 4),
        "test_f1": round(f1_score(y_test, test_preds, average="macro", zero_division=0), 4),
        "val_accuracy": round(accuracy_score(y_val, val_preds), 4),
        "val_f1": round(f1_score(y_val, val_preds, average="macro", zero_division=0), 4),
        "classification_report": report,
        "roc_data": roc_data,
    }


def compute_shap(model, X_train, feature_names):
    sample_size = min(500, len(X_train))
    X_sample = X_train.sample(n=sample_size, random_state=42) if isinstance(X_train, pd.DataFrame) else X_train[:sample_size]

    try:
        explainer = shap.TreeExplainer(model)
        shap_values = explainer.shap_values(X_sample)
    except (ValueError, Exception):
        importances = model.feature_importances_
        importance_pairs = list(zip(feature_names, importances.tolist()))
        importance_pairs.sort(key=lambda x: x[1], reverse=True)
        return [
            {"feature": f, "importance": round(imp, 6)}
            for f, imp in importance_pairs[:10]
        ]

    if isinstance(shap_values, list):
        combined = np.abs(np.array(shap_values)).mean(axis=0).mean(axis=0)
    else:
        combined = np.abs(shap_values).mean(axis=0)
        if combined.ndim > 1:
            combined = combined.mean(axis=1)

    importance_pairs = list(zip(feature_names, combined.tolist()))
    importance_pairs.sort(key=lambda x: x[1], reverse=True)

    return [
        {"feature": f, "importance": round(imp, 6)}
        for f, imp in importance_pairs[:10]
    ]


def generate_signals(
    model, df, feature_columns, bullish_threshold, bearish_threshold, look_ahead
):
    X = df[feature_columns]
    probas = model.predict_proba(X)

    class_order = model.classes_.tolist()
    idx_bullish = class_order.index(2) if 2 in class_order else None
    idx_bearish = class_order.index(1) if 1 in class_order else None

    signals = []
    raw_probas = []

    for i in range(len(df)):
        bull_prob = float(probas[i][idx_bullish]) if idx_bullish is not None else 0
        bear_prob = float(probas[i][idx_bearish]) if idx_bearish is not None else 0

        raw_probas.append({
            "bullish_prob": bull_prob,
            "bearish_prob": bear_prob,
        })

        signal_type = "NEUTRAL"
        confidence = 0.0

        if bull_prob > bullish_threshold and bull_prob > bear_prob:
            signal_type = "BUY"
            confidence = bull_prob
        elif bear_prob > bearish_threshold and bear_prob > bull_prob:
            signal_type = "SELL"
            confidence = bear_prob

        if signal_type == "NEUTRAL":
            continue

        date_val = df.iloc[i].get("Date", df.index[i])
        if hasattr(date_val, "isoformat"):
            date_str = date_val.isoformat()[:10]
        else:
            date_str = str(date_val)[:10]

        outcome = "pending"
        if i + look_ahead < len(df):
            future_avg = df["Close"].iloc[i + 1 : i + 1 + look_ahead].mean()
            current_price = df["Close"].iloc[i]
            if signal_type == "BUY":
                outcome = "correct" if future_avg > current_price else "incorrect"
            elif signal_type == "SELL":
                outcome = "correct" if future_avg < current_price else "incorrect"

        signals.append({
            "date": date_str,
            "signal_type": signal_type,
            "confidence": round(confidence, 4),
            "price": round(float(df["Close"].iloc[i]), 2),
            "outcome": outcome,
        })

    return signals, raw_probas


def filter_signals_from_probas(
    df, raw_probas, bullish_threshold, bearish_threshold, look_ahead
):
    signals = []
    for i, rp in enumerate(raw_probas):
        bull_prob = rp["bullish_prob"]
        bear_prob = rp["bearish_prob"]

        signal_type = "NEUTRAL"
        confidence = 0.0

        if bull_prob > bullish_threshold and bull_prob > bear_prob:
            signal_type = "BUY"
            confidence = bull_prob
        elif bear_prob > bearish_threshold and bear_prob > bull_prob:
            signal_type = "SELL"
            confidence = bear_prob

        if signal_type == "NEUTRAL":
            continue

        date_val = df.iloc[i].get("Date", df.index[i])
        if hasattr(date_val, "isoformat"):
            date_str = date_val.isoformat()[:10]
        else:
            date_str = str(date_val)[:10]

        outcome = "pending"
        if i + look_ahead < len(df):
            future_avg = df["Close"].iloc[i + 1 : i + 1 + look_ahead].mean()
            current_price = df["Close"].iloc[i]
            if signal_type == "BUY":
                outcome = "correct" if future_avg > current_price else "incorrect"
            elif signal_type == "SELL":
                outcome = "correct" if future_avg < current_price else "incorrect"

        signals.append({
            "date": date_str,
            "signal_type": signal_type,
            "confidence": round(confidence, 4),
            "price": round(float(df["Close"].iloc[i]), 2),
            "outcome": outcome,
        })

    return signals
