# PRD — Phase 4: Authentication

Status: ready-for-agent

## Problem Statement

As required by the assignment (requirement #1), the app needs an interactive page
with username, password, and email fields. For a backend-focused project this means
real authentication: users can register and log in, passwords are stored securely
(never in plain text), and the household data pull is gated behind login so only
authenticated users can reach it.

## Solution

A `users` table and an auth feature module exposing register, login, and "current
user" endpoints. Passwords are hashed with bcrypt; a successful register or login
returns a signed JWT. Protected routes are guarded by middleware that verifies the
token. Request bodies are validated with a schema validator. On the web, a combined
register/login page collects username, email, and password, stores the returned
token, and gates the household search: unauthenticated visitors see the auth page,
authenticated users see the search.

## User Stories

1. As a new user, I want to register with a username, email, and password, so that I can create an account.
2. As a returning user, I want to log in with my username (or email) and password, so that I can access the app.
3. As a user, I want my password stored only as a secure hash, so that my credential is never exposed even if the database is seen.
4. As a user, I want to stay logged in after registering or signing in, so that I don't have to re-enter credentials on every action.
5. As a user, I want to be told clearly when my username or email is already taken, so that I can choose another.
6. As a user, I want to be told clearly when my login credentials are wrong, so that I can correct them.
7. As a user, I want to log out, so that I can end my session.
8. As a user, I want the household search to be visible only after I log in, so that the app reflects an authenticated experience.
9. As a developer, I want a `users` table with unique username and email, so that accounts are unambiguous.
10. As a developer, I want register and login to return a signed token, so that the client can authenticate later requests.
11. As a developer, I want middleware that rejects requests without a valid token on protected routes with 401, so that protected data is not exposed.
12. As a developer, I want a "current user" endpoint that returns the authenticated user, so that the client can confirm a session and display identity.
13. As a developer, I want all auth request bodies validated against a schema, so that malformed input is rejected with a clear 400 before reaching business logic.
14. As a developer, I want passwords subject to a minimum strength rule and emails to be well-formed, so that obviously bad input is rejected at the edge.

## Implementation Decisions

- **Users table:** `id` (surrogate key), `username` (unique), `email` (unique),
  `passwordHash`, `createdAt`. Added via a new migration.
- **Password hashing:** bcrypt (via the pure-JS `bcryptjs`), with a sensible cost
  factor. Only the hash is stored; the plain password never is.
- **Tokens:** a signed JWT issued on register and login, returned to the client and
  sent on later requests in the `Authorization: Bearer` header. Signing uses a secret
  read from configuration (an environment variable). Tokens carry the user id and
  username and have an expiry.
- **JWT library:** `jose` (ESM-native), chosen for fit with the project's ESM/TypeScript
  setup.
- **Validation:** request bodies validated with `zod`; invalid input yields 400.
- **Auth middleware:** verifies the bearer token, attaches the authenticated user
  context to the request, and returns 401 when the token is missing or invalid.
- **Endpoints:** `POST /api/auth/register`, `POST /api/auth/login`,
  `GET /api/auth/me` (protected). Duplicate username/email returns 409; bad
  credentials return 401.
- **Layering:** an auth feature module (controller, service, repository) consistent
  with the household module; the middleware lives alongside it.
- **Web:** a combined register/login page collecting username, email, and password.
  The app holds auth state (token + user), persists it so a refresh keeps the user
  signed in, and gates the household search behind authentication, with a visible
  logout control.
- **Configuration:** a JWT secret (and token expiry) provided via environment
  variables, documented in the example env file.

## Testing Decisions

- A good test verifies **external behavior** at the **HTTP seam** — register, log in,
  and call protected routes over HTTP, asserting on responses and status codes.
- **Integration tests** (against the dedicated test database): a registered user can
  log in and call the protected "current user" endpoint with the returned token (200);
  registering a duplicate username or email returns 409; logging in with a wrong
  password returns 401; calling a protected route with no or an invalid token returns
  401; the stored password is a hash, not the plain text.
- The suite continues to run serially against the test database, as established in
  Phase 3.
- Prior art: the household endpoint tests (HTTP via supertest, fixtures in the test
  database).

## Out of Scope

- Password reset / email verification flows.
- Roles, permissions, or multi-tenant authorization (a single user role is assumed).
- OAuth / third-party sign-in.
- Refresh-token rotation (a single reasonably-expiring access token is used).
- Loading data through the web app (Phase 5), the dashboard (Phase 6), and ML (Phase 7).

## Further Notes

- JWT was chosen over httpOnly session cookies for simplicity and because it is the
  most common, interview-standard pattern; the tradeoff (cookie storage resists XSS
  token theft but needs CSRF handling) will be noted in the README.
- bcrypt was chosen over argon2id to avoid native build dependencies in the container;
  bcrypt with an appropriate cost factor remains a secure, industry-standard choice.
