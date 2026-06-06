-- Runs automatically the first time the Postgres data volume is initialized
-- (Docker's /docker-entrypoint-initdb.d hook). Creates the database used by the
-- integration test suite, kept separate from the dev database.
CREATE DATABASE kroger_test;
