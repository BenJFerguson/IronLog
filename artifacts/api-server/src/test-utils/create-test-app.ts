import express, { type Request, type Response, type NextFunction } from "express";
import router from "../routes/index.js";

/**
 * Builds a lightweight Express app suitable for supertest.
 * Skips the PostgreSQL session store and pino logger used by the real app.
 *
 * @param userId - When provided the request is treated as authenticated (session.userId is set).
 *                 Omit or pass undefined to simulate an unauthenticated request.
 */
export function createTestApp(userId?: number) {
  const app = express();

  app.use(express.json());

  // Inject a minimal session object so route handlers that read req.session.userId work.
  app.use((req: Request, _res: Response, next: NextFunction) => {
    (req as any).session = {
      userId,
      destroy: (cb: () => void) => cb(),
    };
    next();
  });

  app.use("/api", router);

  return app;
}
