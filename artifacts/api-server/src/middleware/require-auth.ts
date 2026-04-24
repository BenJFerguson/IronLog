import type { Request, Response } from "express";

// Extend express-session's SessionData so req.session.userId is typed throughout the app
declare module "express-session" {
  interface SessionData {
    userId: number;
  }
}

/**
 * Extracts the authenticated userId from the session.
 * Sends a 401 and returns null if there is no active session.
 * Call this at the top of every protected route handler and return early if null.
 */
export function requireAuth(req: Request, res: Response): number | null {
  const userId = req.session.userId;
  if (!userId) {
    res.status(401).json({ error: "Not authenticated" });
    return null;
  }
  return userId;
}
