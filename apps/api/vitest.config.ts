import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // All test files share one test database, so run them serially (not in
    // parallel) to avoid them clobbering each other's fixtures.
    fileParallelism: false,
  },
});
