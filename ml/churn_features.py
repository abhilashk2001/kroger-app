"""Pure label + feature construction for churn prediction. No database, no model -
so the churn definition can be unit-tested directly (see test_churn_features.py).

Framing: pick a `cutoff` near the end of the data. Features are computed only from
transactions on/before the cutoff; the label is whether the household made any
purchase strictly after it. Households with no pre-cutoff activity are excluded
(they have no features). This is a leak-free supervised setup.
"""

from __future__ import annotations

import pandas as pd

FEATURE_COLUMNS = [
    "recency_days",
    "frequency",
    "monetary_total",
    "monetary_avg",
    "tenure_days",
    "recent_spend",
    "earlier_spend",
    "trend_ratio",
    "loyalty",
]


def build_household_features(
    df: pd.DataFrame,
    cutoff: pd.Timestamp,
    recent_window_days: int = 90,
) -> pd.DataFrame:
    """Return one row per household active before `cutoff`, with RFM-style features
    and a `churned` label (1 = no purchase after the cutoff). Indexed by hshd_num."""
    df = df.copy()
    df["purchase_date"] = pd.to_datetime(df["purchase_date"])
    df["spend"] = df["spend"].astype(float)

    pre = df[df["purchase_date"] <= cutoff]
    post_households = set(df.loc[df["purchase_date"] > cutoff, "hshd_num"].unique())
    recent_start = cutoff - pd.Timedelta(days=recent_window_days)

    rows = []
    for hshd, g in pre.groupby("hshd_num"):
        last = g["purchase_date"].max()
        first = g["purchase_date"].min()
        recent_spend = g.loc[g["purchase_date"] > recent_start, "spend"].sum()
        earlier_spend = g.loc[g["purchase_date"] <= recent_start, "spend"].sum()
        basket_spend = g.groupby("basket_num")["spend"].sum()

        rows.append(
            {
                "hshd_num": int(hshd),
                "recency_days": (cutoff - last).days,
                "frequency": int(g["basket_num"].nunique()),
                "monetary_total": float(g["spend"].sum()),
                "monetary_avg": float(basket_spend.mean()),
                "tenure_days": (last - first).days,
                "recent_spend": float(recent_spend),
                "earlier_spend": float(earlier_spend),
                # +1 avoids divide-by-zero; >1 means spending is accelerating.
                "trend_ratio": float(recent_spend / (earlier_spend + 1.0)),
                "loyalty": int(bool(g["loyalty_flag"].iloc[0])),
                "churned": 0 if int(hshd) in post_households else 1,
            }
        )

    return pd.DataFrame(rows).set_index("hshd_num")


def risk_band(probability: float) -> str:
    """Bucket a churn probability into a Low/Medium/High band."""
    if probability >= 0.66:
        return "High"
    if probability >= 0.33:
        return "Medium"
    return "Low"
