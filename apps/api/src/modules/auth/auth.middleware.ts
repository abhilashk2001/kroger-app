// Middleware guarding protected routes: verifies the Bearer token and attaches the
// authenticated user to the request, or responds 401.

import type { Request, Response, NextFunction } from "express";
import { getUserFromToken, AuthError, type PublicUser } from "./auth.service";

// Let TypeScript know req.user exists once a route is behind requireAuth.
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: PublicUser;
    }
  }
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Authentication required." });
  }

  const token = header.slice("Bearer ".length);
  try {
    req.user = await getUserFromToken(token);
    next();
  } catch (error) {
    const status = error instanceof AuthError ? error.status : 401;
    const message = error instanceof Error ? error.message : "Unauthorized.";
    res.status(status).json({ error: message });
  }
}
