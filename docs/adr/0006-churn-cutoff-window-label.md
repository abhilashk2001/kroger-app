# ADR-0006 - Churn label: cutoff-window framing

Status: Accepted

## Context

The transaction log has no explicit "canceled" event, so a churn target has to be
constructed from purchase behavior - and constructed carefully to avoid label leakage.

## Decision

Pick a **cutoff** 90 days before the data ends. Compute features only from transactions
**on/before** the cutoff; label a household **churned** if it made **no purchase after**
the cutoff. Only households with pre-cutoff activity are scored. Features are RFM-style
(recency, frequency, monetary, tenure, recent-vs-earlier spend trend, loyalty); the model
is **Gradient Boosting**, writing per-household probability + risk band to
`household_churn`.

## Rationale

- The cutoff split is the standard, defensible way to manufacture a churn target from
  transaction logs without leaking the outcome into the features.
- RFM features connect the model back to concrete retention levers (e.g. win-back offers
  for high-recency households).

## Consequences & honest caveat

- The held-out ROC-AUC is **very high (~0.99)** - but this is partly **mechanical**: the
  label ("quiet for 90 days") correlates strongly with recency-at-cutoff, so the task is
  inherently easy. This should be described as a **recency-driven risk model**, not a claim
  of deep predictive power.
- The window length is a tunable; a different horizon would shift the base rate and the
  population scored.
