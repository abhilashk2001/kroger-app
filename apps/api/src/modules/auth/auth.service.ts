// SERVICE layer: the auth business logic - hashing, credential verification, and
// issuing/verifying JWTs. Throws AuthError (with an HTTP status) for the controller
// and middleware to translate into responses.

import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { config } from "../../core/config";
import {
  createUser,
  findUserByLogin,
  findUserById,
  findUserByUsernameOrEmail,
} from "./auth.repository";
import type { RegisterInput, LoginInput } from "./auth.schemas";

const secret = new TextEncoder().encode(config.jwtSecret);
const BCRYPT_ROUNDS = 10;

export interface PublicUser {
  id: number;
  username: string;
  email: string;
}

export interface AuthResult {
  token: string;
  user: PublicUser;
}

export class AuthError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

function toPublicUser(u: { id: number; username: string; email: string }): PublicUser {
  return { id: u.id, username: u.username, email: u.email };
}

async function issueToken(user: PublicUser): Promise<string> {
  return new SignJWT({ username: user.username })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(String(user.id))
    .setIssuedAt()
    .setExpirationTime(config.jwtExpiresIn)
    .sign(secret);
}

export async function register(input: RegisterInput): Promise<AuthResult> {
  const existing = await findUserByUsernameOrEmail(input.username, input.email);
  if (existing) {
    throw new AuthError(409, "Username or email is already taken.");
  }

  const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);
  const user = await createUser({
    username: input.username,
    email: input.email,
    passwordHash,
  });

  const publicUser = toPublicUser(user);
  return { token: await issueToken(publicUser), user: publicUser };
}

export async function login(input: LoginInput): Promise<AuthResult> {
  const user = await findUserByLogin(input.usernameOrEmail);
  // Always run a comparison-shaped failure path to avoid leaking which part was wrong.
  if (!user) throw new AuthError(401, "Invalid credentials.");

  const ok = await bcrypt.compare(input.password, user.passwordHash);
  if (!ok) throw new AuthError(401, "Invalid credentials.");

  const publicUser = toPublicUser(user);
  return { token: await issueToken(publicUser), user: publicUser };
}

/** Verifies a JWT and returns the current user, or throws AuthError(401). */
export async function getUserFromToken(token: string): Promise<PublicUser> {
  try {
    const { payload } = await jwtVerify(token, secret);
    const user = await findUserById(Number(payload.sub));
    if (!user) throw new AuthError(401, "User no longer exists.");
    return toPublicUser(user);
  } catch (error) {
    if (error instanceof AuthError) throw error;
    throw new AuthError(401, "Invalid or expired token.");
  }
}
