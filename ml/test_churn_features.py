"""Unit tests for the churn label/feature logic. Run in the ml container:
    docker compose run --rm ml pytest -q
"""

import pandas as pd
from churn_features import build_household_features, risk_band


def _sample():
    # hshd 1: buys before AND after cutoff -> not churned
    # hshd 2: buys only before cutoff      -> churned
    # hshd 3: buys only after cutoff       -> excluded (no pre-cutoff features)
    return pd.DataFrame(
        {
            "hshd_num": [1, 1, 2, 3],
            "basket_num": [10, 11, 20, 30],
            "purchase_date": ["2020-01-01", "2020-06-01", "2020-01-01", "2020-07-15"],
            "spend": [10.0, 20.0, 5.0, 8.0],
            "loyalty_flag": [True, True, False, True],
        }
    )


def test_label_and_population():
    cutoff = pd.Timestamp("2020-05-01")
    feats = build_household_features(_sample(), cutoff)

    # Only pre-cutoff households are scored.
    assert set(feats.index) == {1, 2}
    # hshd 1 returned after the cutoff; hshd 2 did not.
    assert feats.loc[1, "churned"] == 0
    assert feats.loc[2, "churned"] == 1


def test_recency_and_frequency():
    cutoff = pd.Timestamp("2020-05-01")
    feats = build_household_features(_sample(), cutoff)

    # hshd 1's only pre-cutoff purchase is 2020-01-01 -> 121 days before cutoff.
    assert feats.loc[1, "recency_days"] == 121
    assert feats.loc[1, "frequency"] == 1
    assert feats.loc[2, "loyalty"] == 0


def test_risk_band_thresholds():
    assert risk_band(0.9) == "High"
    assert risk_band(0.5) == "Medium"
    assert risk_band(0.1) == "Low"
