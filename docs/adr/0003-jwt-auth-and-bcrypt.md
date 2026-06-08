# ADR-0003 - JWT auth and bcrypt password hashing

Status: Accepted

## Context

The app needs authentication (the assignment requires a username/password/email page) and
must store credentials securely and gate the data features behind login.

## Decision

- Issue a signed **JWT** on register/login, sent by the client in the
  `Authorization: Bearer` header; protected routes verify it via middleware.
- Hash passwords with **bcrypt** (`bcryptjs`); store only the hash.
- Validate all auth request bodies with **zod**.

## Rationale

- **JWT over httpOnly session cookies:** JWT is the most common, interview-standard pattern
  and keeps the API stateless. The trade-off is real and acknowledged - an httpOnly cookie
  resists XSS token theft but then needs CSRF handling; for a single-user portfolio app the
  bearer-token model is simpler and sufficient.
- **bcrypt over argon2id:** argon2id is stronger in the abstract, but bcrypt at a sensible
  cost factor is a secure industry standard and, via `bcryptjs`, avoids native build
  dependencies in the container - simpler, portable images.

## Consequences

- Stateless auth; tokens carry id + username and expire.
- Tokens live in client storage (XSS is the relevant threat) - accepted for this project;
  a cookie-based session would be the hardening path for a multi-user deployment.
