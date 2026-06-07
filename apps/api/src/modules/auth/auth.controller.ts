// CONTROLLER layer: HTTP only. Validates with zod, calls the service, maps results
// and AuthErrors to responses.

import { Router } from "express";
import { registerSchema, loginSchema } from "./auth.schemas";
import { register, login, AuthError } from "./auth.service";
import { requireAuth } from "./auth.middleware";

export const authRouter = Router();

authRouter.post("/register", async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    return res
      .status(400)
      .json({ error: "Invalid input.", details: parsed.error.flatten() });
  }

  try {
    const result = await register(parsed.data);
    res.status(201).json(result);
  } catch (error) {
    if (error instanceof AuthError) {
      return res.status(error.status).json({ error: error.message });
    }
    console.error(error);
    res.status(500).json({ error: "Internal error." });
  }
});

authRouter.post("/login", async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res
      .status(400)
      .json({ error: "Invalid input.", details: parsed.error.flatten() });
  }

  try {
    const result = await login(parsed.data);
    res.json(result);
  } catch (error) {
    if (error instanceof AuthError) {
      return res.status(error.status).json({ error: error.message });
    }
    console.error(error);
    res.status(500).json({ error: "Internal error." });
  }
});

authRouter.get("/me", requireAuth, (req, res) => {
  res.json({ user: req.user });
});
