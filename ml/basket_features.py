"""Pure feature-construction helpers for basket analysis. No database, no model —
so they can be unit-tested directly (see test_basket_features.py)."""

from __future__ import annotations

from typing import List
import pandas as pd
from mlxtend.preprocessing import TransactionEncoder


def baskets_to_itemsets(
    df: pd.DataFrame,
    basket_col: str = "basket_num",
    item_col: str = "commodity",
) -> List[List[str]]:
    """Group purchase lines into one sorted, de-duplicated itemset per basket."""
    grouped = df.groupby(basket_col)[item_col].apply(lambda s: sorted(set(s)))
    return [items for items in grouped.tolist() if len(items) > 0]


def itemsets_to_onehot(itemsets: List[List[str]]) -> pd.DataFrame:
    """One-hot encode itemsets into a boolean DataFrame (one column per commodity)."""
    encoder = TransactionEncoder()
    array = encoder.fit_transform(itemsets)
    return pd.DataFrame(array, columns=encoder.columns_)
