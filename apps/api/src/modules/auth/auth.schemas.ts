// Zod schemas validate auth request bodies at the edge, before any business logic.

import { z } from "zod";

export const registerSchema = z.object({
  username: z.string().trim().min(3).max(50),
  email: z.string().trim().email(),
  password: z.string().min(8).max(100),
});

export const loginSchema = z.object({
  usernameOrEmail: z.string().trim().min(1),
  password: z.string().min(1),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
