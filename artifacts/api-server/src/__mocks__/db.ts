/**
 * Manual mock for @workspace/db.
 * Each route that imports from @workspace/db gets this module instead.
 * Tests configure the mock functions using mockReturnValueOnce / mockResolvedValueOnce.
 */

// Minimal table stubs — only need enough shape for drizzle-orm condition builders to not crash.
export const usersTable = { id: "id", email: "email", passwordHash: "passwordHash", createdAt: "createdAt" } as any;
export const workoutsTable = { id: "id", userId: "userId", date: "date", notes: "notes", createdAt: "createdAt" } as any;
export const workoutSetsTable = { id: "id", workoutId: "workoutId", exerciseName: "exerciseName", weight: "weight", reps: "reps", rpe: "rpe", createdAt: "createdAt" } as any;

/**
 * Creates a chainable, thenable query builder that resolves to `value`.
 * Handles the Drizzle ORM fluent API pattern:
 *   db.select().from(t).where(c).limit(n)  → awaits to `value`
 *   db.insert(t).values(v).returning()     → resolves to `value`
 *   db.delete(t).where(c)                  → awaits to `value`
 */
export function createQueryChain(value: unknown = []): any {
  const chain: Record<string, any> = {};
  for (const method of ["from", "where", "limit", "offset", "orderBy", "values"]) {
    chain[method] = jest.fn().mockReturnValue(chain);
  }
  chain.returning = jest.fn().mockResolvedValue(value);
  // Make chain itself awaitable (thenable) so `await db.select().from(t).where(c)` works
  chain.then = (resolve: (v: unknown) => unknown, reject: (e: unknown) => unknown) =>
    Promise.resolve(value).then(resolve, reject);
  chain.catch = (reject: (e: unknown) => unknown) => Promise.resolve(value).catch(reject);
  chain.finally = (fn: () => void) => Promise.resolve(value).finally(fn);
  return chain;
}

export const db = {
  select: jest.fn(() => createQueryChain()),
  insert: jest.fn(() => createQueryChain()),
  delete: jest.fn(() => createQueryChain()),
};

export const pool = {
  query: jest.fn().mockResolvedValue({ rows: [] }),
};
