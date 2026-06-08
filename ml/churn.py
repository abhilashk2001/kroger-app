"""Offline churn prediction (assignment requirement #7).

Frames a leak-free churn target over the data's final window, engineers RFM-style
per-household features, trains a Gradient Boosting classifier, and writes:
  - household_churn        : per-household churn probability + risk band
  - churn_model_metric     : accuracy, ROC-AUC, base churn rate, top drivers
  - ml/reports/churn_correlations.csv : feature-vs-churn correlations (graphical aid)

Run on demand:
    docker compose run --rm ml python churn.py
"""

from __future__ import annotations

import os
import pandas as pd
from sklearn.ensemble import GradientBoostingClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, roc_auc_score

from db import get_engine, load_household_activity, replace_table
from churn_features import build_household_features, risk_band, FEATURE_COLUMNS

HOLDOUT_DAYS = 90       # the final window that defines "active vs churned"
TOP_DRIVERS = 6
REPORTS_DIR = "reports"


def main() -> None:
    engine = get_engine()

    activity = load_household_activity(engine)
    activity["purchase_date"] = pd.to_datetime(activity["purchase_date"])
    cutoff = activity["purchase_date"].max() - pd.Timedelta(days=HOLDOUT_DAYS)
    print(f"Data ends {activity['purchase_date'].max().date()}; cutoff = {cutoff.date()}")

    features = build_household_features(activity, cutoff, recent_window_days=HOLDOUT_DAYS)
    X = features[FEATURE_COLUMNS]
    y = features["churned"]
    print(f"{len(features):,} households scored; churn base rate = {y.mean():.1%}")

    if y.nunique() < 2:
        print("Only one class present - cannot train. Aborting.")
        return

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.25, random_state=42, stratify=y
    )
    model = GradientBoostingClassifier(random_state=42)
    model.fit(X_train, y_train)

    accuracy = accuracy_score(y_test, model.predict(X_test))
    roc_auc = roc_auc_score(y_test, model.predict_proba(X_test)[:, 1])
    print(f"Held-out accuracy = {accuracy:.3f}, ROC-AUC = {roc_auc:.3f}")

    # Score every scored household (fit on train; predict for all to store risk).
    probabilities = model.predict_proba(X)[:, 1]
    scores = pd.DataFrame(
        {
            "hshd_num": features.index.astype(int),
            "churn_probability": probabilities.round(4),
            "risk_band": [risk_band(p) for p in probabilities],
        }
    )
    written = replace_table(engine, scores, "household_churn")
    print(f"Wrote {written} household churn scores")
    print(scores["risk_band"].value_counts().to_string())

    importances = pd.Series(model.feature_importances_, index=FEATURE_COLUMNS)
    top_drivers = importances.sort_values(ascending=False).head(TOP_DRIVERS).index.tolist()
    metric = pd.DataFrame(
        [
            {
                "accuracy": round(float(accuracy), 4),
                "roc_auc": round(float(roc_auc), 4),
                "churn_rate": round(float(y.mean()), 4),
                "top_drivers": ", ".join(top_drivers),
            }
        ]
    )
    replace_table(engine, metric, "churn_model_metric")
    print(f"Top drivers: {', '.join(top_drivers)}")

    # Correlation aid (satisfies the 'correlation/graphical results' phrasing).
    os.makedirs(REPORTS_DIR, exist_ok=True)
    correlations = (
        features[FEATURE_COLUMNS + ["churned"]]
        .corr()["churned"]
        .drop("churned")
        .sort_values()
    )
    correlations.to_csv(os.path.join(REPORTS_DIR, "churn_correlations.csv"))
    print("\nFeature correlation with churn:")
    print(correlations.round(3).to_string())


if __name__ == "__main__":
    main()
