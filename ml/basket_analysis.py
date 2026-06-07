"""Offline basket analysis (assignment requirement #6).

Two deliverables, both written into Prisma-owned tables:
  1. FP-Growth association rules over commodity baskets -> basket_rules.
  2. A Gradient Boosting co-purchase classifier (the assignment's named model) for the
     most-frequent commodity -> basket_model_metric.

Run on demand:
    docker compose run --rm ml python basket_analysis.py
"""

from __future__ import annotations

import pandas as pd
from mlxtend.frequent_patterns import fpgrowth, association_rules
from sklearn.ensemble import GradientBoostingClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, roc_auc_score

from db import get_engine, load_basket_lines, replace_table
from basket_features import baskets_to_itemsets, itemsets_to_onehot

# Tunables — printed counts after a run make these easy to adjust. The trimmed sample
# averages ~1.7 items/basket, so co-occurrence is sparse and a low support is needed
# to surface any pairs at all.
MIN_SUPPORT = 0.001     # itemset must appear in >= 0.1% of baskets (~30 of 30k)
MIN_CONFIDENCE = 0.05
TOP_RULES = 50
TOP_DRIVERS = 8


def mine_rules(onehot: pd.DataFrame) -> pd.DataFrame:
    """FP-Growth frequent itemsets -> association rules, ranked by lift."""
    columns = ["antecedents", "consequents", "support", "confidence", "lift"]
    frequent = fpgrowth(onehot, min_support=MIN_SUPPORT, use_colnames=True)
    if frequent.empty:
        return pd.DataFrame(columns=columns)

    # mlxtend 0.23.x requires the basket count (used to compute the rule metrics).
    rules = association_rules(
        frequent, num_itemsets=len(onehot), metric="lift", min_threshold=1.0
    )
    rules = rules[rules["confidence"] >= MIN_CONFIDENCE]
    rules = rules.sort_values("lift", ascending=False).head(TOP_RULES)

    return pd.DataFrame(
        {
            "antecedents": rules["antecedents"].apply(lambda s: ", ".join(sorted(s))),
            "consequents": rules["consequents"].apply(lambda s: ", ".join(sorted(s))),
            "support": rules["support"].astype(float).round(4),
            "confidence": rules["confidence"].astype(float).round(4),
            "lift": rules["lift"].astype(float).round(4),
        }
    )


def train_copurchase(onehot: pd.DataFrame) -> pd.DataFrame | None:
    """Gradient Boosting: predict whether a basket contains the most-frequent
    commodity from the other commodities present. Returns a one-row metric frame."""
    target = onehot.sum().idxmax()
    y = onehot[target].astype(int)
    if y.nunique() < 2:
        return None

    X = onehot.drop(columns=[target]).astype(int)
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.25, random_state=42, stratify=y
    )

    model = GradientBoostingClassifier(random_state=42)
    model.fit(X_train, y_train)

    proba = model.predict_proba(X_test)[:, 1]
    accuracy = accuracy_score(y_test, model.predict(X_test))
    roc_auc = roc_auc_score(y_test, proba)

    importances = pd.Series(model.feature_importances_, index=X.columns)
    top_drivers = importances.sort_values(ascending=False).head(TOP_DRIVERS).index.tolist()

    return pd.DataFrame(
        [
            {
                "target_commodity": target,
                "accuracy": round(float(accuracy), 4),
                "roc_auc": round(float(roc_auc), 4),
                "top_drivers": ", ".join(top_drivers),
            }
        ]
    )


def main() -> None:
    engine = get_engine()

    lines = load_basket_lines(engine)
    print(f"Loaded {len(lines):,} basket lines")

    itemsets = baskets_to_itemsets(lines)
    onehot = itemsets_to_onehot(itemsets)
    print(f"{len(itemsets):,} baskets across {onehot.shape[1]} distinct commodities")

    rules = mine_rules(onehot)
    written = replace_table(engine, rules, "basket_rules")
    print(f"\nWrote {written} association rules to basket_rules")
    if not rules.empty:
        print(rules.head(10).to_string(index=False))

    metric = train_copurchase(onehot)
    if metric is not None:
        replace_table(engine, metric, "basket_model_metric")
        print("\nCo-purchase Gradient Boosting model:")
        print(metric.to_string(index=False))
    else:
        print("\nSkipped co-purchase model (target commodity has a single class).")


if __name__ == "__main__":
    main()
