"""Shared database access for the offline ML jobs.

Builds a SQLAlchemy connection from the POSTGRES_* env vars (reaching the database
by the compose service name `db`, exactly like the API does). Provides loaders that
return transactions as a pandas DataFrame, and a helper that replaces a result table
(truncate-then-insert) so each model run is idempotent.

Run directly as a sanity check:
    docker compose run --rm ml python db.py
"""

from __future__ import annotations

import os
import pandas as pd
from sqlalchemy import create_engine, text
from sqlalchemy.engine import Engine


def get_engine() -> Engine:
    user = os.environ["POSTGRES_USER"]
    password = os.environ["POSTGRES_PASSWORD"]
    db = os.environ["POSTGRES_DB"]
    host = os.environ.get("POSTGRES_HOST", "db")
    port = os.environ.get("POSTGRES_PORT", "5432")
    url = f"postgresql+psycopg2://{user}:{password}@{host}:{port}/{db}"
    return create_engine(url)


def load_basket_lines(engine: Engine) -> pd.DataFrame:
    """One row per purchased line, joined to the product's commodity/department/brand.
    The basket-analysis features are built from this."""
    sql = text(
        """
        SELECT t.basket_num, t.hshd_num, t.product_num, t.purchase_date,
               t.spend, t.units,
               p.commodity, p.department, p.brand_type, p.is_organic
        FROM transactions t
        JOIN products p ON p.product_num = t.product_num
        """
    )
    return pd.read_sql(sql, engine)


def load_household_activity(engine: Engine) -> pd.DataFrame:
    """One row per purchased line with household demographics, for churn features."""
    sql = text(
        """
        SELECT t.hshd_num, t.basket_num, t.purchase_date, t.spend,
               h.loyalty_flag, h.income_range, h.hh_size, h.children
        FROM transactions t
        JOIN households h ON h.hshd_num = t.hshd_num
        """
    )
    return pd.read_sql(sql, engine)


def replace_table(engine: Engine, df: pd.DataFrame, table_name: str) -> int:
    """Truncate `table_name` and insert `df` in one transaction. Columns of `df` must
    match the table's column names; columns with DB defaults (id, created_at) are
    omitted and filled by Postgres. Returns the number of rows written."""
    with engine.begin() as conn:
        conn.execute(text(f'TRUNCATE TABLE "{table_name}" RESTART IDENTITY CASCADE'))
        df.to_sql(table_name, conn, if_exists="append", index=False)
    return len(df)


if __name__ == "__main__":
    engine = get_engine()
    with engine.connect() as conn:
        for table in ("households", "products", "transactions"):
            count = conn.execute(text(f"SELECT COUNT(*) FROM {table}")).scalar()
            print(f"{table:<14} {count:>10,} rows")
    print("DB connection OK.")
