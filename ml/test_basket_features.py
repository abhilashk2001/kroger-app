"""Unit tests for the basket feature helpers. Run in the ml container:
    docker compose run --rm ml pytest -q
"""

import pandas as pd
from basket_features import baskets_to_itemsets, itemsets_to_onehot


def test_baskets_to_itemsets_groups_and_dedupes():
    df = pd.DataFrame(
        {
            "basket_num": [1, 1, 1, 2, 2],
            "commodity": ["BREAD", "MILK", "BREAD", "MILK", "EGGS"],
        }
    )
    itemsets = baskets_to_itemsets(df)
    # Basket 1 dedupes BREAD; each itemset is sorted.
    assert sorted(itemsets) == [["BREAD", "MILK"], ["EGGS", "MILK"]]


def test_itemsets_to_onehot_shape_and_values():
    itemsets = [["BREAD", "MILK"], ["MILK", "EGGS"]]
    onehot = itemsets_to_onehot(itemsets)
    assert set(onehot.columns) == {"BREAD", "MILK", "EGGS"}
    assert onehot.shape == (2, 3)
    # MILK is in both baskets; BREAD only in the first.
    assert onehot["MILK"].tolist() == [True, True]
    assert onehot["BREAD"].tolist() == [True, False]
