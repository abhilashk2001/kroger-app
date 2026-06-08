# CONTEXT - Domain Glossary

The vocabulary of the 84.51°/Kroger "Complete Journey" dataset and this app, using the
exact terms the code, schema, and UI use. When naming a domain concept (in code, an issue,
a test), use the term as defined here.

## Entities

- **Household** (`hshdNum` / `HSHD_NUM`) - a sampled shopper unit; the primary subject of
  analysis. 400 in the sample. May carry optional demographics.
- **Product** (`productNum` / `PRODUCT_NUM`) - a catalog item (~67k). Has a department,
  commodity, brand type, and organic flag.
- **Transaction** - one **line item**: a single product bought in a single basket, with
  spend, units, date, and store region. The fact table.
- **Basket** (`basketNum` / `BASKET_NUM`) - one shopping trip; the set of transactions
  sharing a basket number. The unit of analysis for basket analysis.

## Product attributes

- **Department** - broad category (e.g. FOOD, NON-FOOD, PHARMA).
- **Commodity** - finer category within a department (e.g. BREAD, DAIRY, GROCERY STAPLE).
  **Basket analysis is done at the commodity level**, not per product.
- **Brand type** (`brandType`) - `PRIVATE` (store brand) vs `NATIONAL`.
- **Organic** (`isOrganic`) - the natural/organic flag.

## Transaction attributes

- **Spend** - money for the line (exact `Decimal`).
- **Units** - quantity purchased.
- **Store region** - coarse region (e.g. CENTRAL, EAST, WEST).
- **Week / Year** - the retailer's week number and calendar year.

## Household demographics (optional, often missing)

Age range, marital status, **income range**, homeowner, household composition, **household
size**, **children**, and the **loyalty flag** (loyalty-program member or not). Missing
values arrive as the literal string `null` in the CSVs and are normalized to real nulls.

## Data pull

A **data pull** is a household's full purchase history, joined across households,
transactions, and products, sorted by the assignment's required keys: **household, basket,
date, product, department, commodity**. Surfaced on the Search tab.

## Basket analysis (cross-sell)

- **Association rule** - "if a basket contains *antecedents*, it also contains
  *consequents*", over commodities (FP-Growth).
- **Support** - fraction of baskets containing the itemset.
- **Confidence** - P(consequent | antecedent).
- **Lift** - confidence ÷ base rate of the consequent; **> 1 means positive association**.
  The headline cross-sell metric.
- **Co-purchase model** - a Gradient Boosting classifier predicting whether a basket
  contains a target commodity from the others present; reported with accuracy / ROC-AUC and
  top driver commodities.

## Churn

- **Churn** - a household disengaging: here, **no purchase in the final 90-day window**
  (the "cutoff"). Features are computed only from before the cutoff.
- **RFM features** - Recency (days since last purchase), Frequency (distinct baskets),
  Monetary (total/avg spend); plus **tenure** (first→last span) and a recent-vs-earlier
  spend **trend**.
- **Churn probability** - model-estimated P(churn) per household, 0-1.
- **Risk band** - bucketed probability: **Low / Medium / High**.

## Pipeline terms

- **ETL / loader** - the streaming CSV ingestion. Handles dataset quirks: whitespace-padded
  headers and values, literal `"null"` strings, zero-padded IDs, money like `.59`, and
  Oracle `DD-MON-YY` dates. Orphan transactions (referencing an absent household/product)
  are skipped and counted.
- **Offline ML** - Python jobs that precompute results into DB tables; see
  [ADR-0004](docs/adr/0004-offline-ml-precomputed-to-db.md).
