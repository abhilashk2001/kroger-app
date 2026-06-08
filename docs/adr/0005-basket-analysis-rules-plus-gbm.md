# ADR-0005 — Basket analysis: association rules + a Gradient Boosting model

Status: Accepted

## Context

The assignment asks to "perform basket analysis" and names Linear Regression / Random
Forest / Gradient Boosting as the model options — but finding "commonly purchased product
combinations" is classically **association-rule mining**, which isn't one of those models.

## Decision

Do both, at the **commodity** level (products are too sparse at ~67k SKUs):

1. **FP-Growth association rules** — antecedents → consequents with support, confidence,
   and **lift**, ranked by lift, written to `basket_rules`.
2. A **Gradient Boosting** co-purchase classifier — predict whether a basket contains the
   most-frequent commodity from the other commodities present; report accuracy / ROC-AUC
   and the top feature importances, written to `basket_model_metric`.

## Rationale

- Association rules are the textbook-correct technique for the actual cross-sell question
  and produce directly actionable output (lift-ranked combinations).
- The GBM satisfies the assignment's literal "use one of these models" requirement and
  quantifies co-purchase drivers — so we get correctness *and* compliance.
- Commodity granularity keeps support values meaningful and rules interpretable on the
  trimmed sample.

## Consequences

- Two models to explain, but a stronger and more honest answer than either alone.
- The trimmed sample averages ~1.7 items/basket, so a low `min_support` (~0.001) is needed
  to surface pairs — a property of the data, tuned and documented in the script.
