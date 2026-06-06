// A single shared PrismaClient instance for the whole app. Creating more than
// one would open redundant connection pools, so we export exactly one.

import { PrismaClient } from "@prisma/client";

export const prisma = new PrismaClient();
