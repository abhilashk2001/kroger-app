// REPOSITORY layer: all database access for users.

import { prisma } from "../../core/prisma";

export function findUserByUsernameOrEmail(username: string, email: string) {
  return prisma.user.findFirst({ where: { OR: [{ username }, { email }] } });
}

export function findUserByLogin(identifier: string) {
  return prisma.user.findFirst({
    where: { OR: [{ username: identifier }, { email: identifier }] },
  });
}

export function findUserById(id: number) {
  return prisma.user.findUnique({ where: { id } });
}

export function createUser(data: {
  username: string;
  email: string;
  passwordHash: string;
}) {
  return prisma.user.create({ data });
}
