import request from "supertest";
import { createTestApp } from "../../test-utils/create-test-app";
import { db, createQueryChain } from "../../__mocks__/db";

// Mock bcryptjs at module level — jest.mock() is hoisted above imports in CJS mode.
jest.mock("bcryptjs", () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

// Import after mock so we get the mocked version
import bcrypt from "bcryptjs";

const MOCK_USER = { id: 1, email: "test@example.com", passwordHash: "hashed_password" };

// Unauthenticated app for login/signup; authenticated app for /me
const app = createTestApp();
const authedApp = createTestApp(1);

beforeEach(() => {
  // resetMocks clears all implementations between tests — re-apply safe defaults.
  (bcrypt.hash as jest.Mock).mockResolvedValue("hashed_password");
  (bcrypt.compare as jest.Mock).mockResolvedValue(true);
});

// ---------------------------------------------------------------------------
// POST /api/auth/signup
// ---------------------------------------------------------------------------
describe("POST /api/auth/signup", () => {
  it("creates a user and returns 201", async () => {
    // No existing user
    (db.select as jest.Mock).mockReturnValueOnce(createQueryChain([]));
    // Insert returns the new user
    (db.insert as jest.Mock).mockReturnValueOnce(
      createQueryChain([{ id: 1, email: "test@example.com" }])
    );

    const res = await request(app)
      .post("/api/auth/signup")
      .send({ email: "test@example.com", password: "password123" });

    expect(res.status).toBe(201);
    expect(res.body).toEqual({ id: 1, email: "test@example.com" });
    expect(bcrypt.hash).toHaveBeenCalledWith("password123", 12);
  });

  it("returns 409 when email is already registered", async () => {
    (db.select as jest.Mock).mockReturnValueOnce(createQueryChain([MOCK_USER]));

    const res = await request(app)
      .post("/api/auth/signup")
      .send({ email: "test@example.com", password: "password123" });

    expect(res.status).toBe(409);
    expect(res.body).toEqual({ error: "Email already registered" });
  });

  it("returns 400 for an invalid email", async () => {
    const res = await request(app)
      .post("/api/auth/signup")
      .send({ email: "not-an-email", password: "password123" });

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: "Invalid input" });
  });

  it("returns 400 when password is shorter than 6 characters", async () => {
    const res = await request(app)
      .post("/api/auth/signup")
      .send({ email: "test@example.com", password: "abc" });

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: "Invalid input" });
  });

  it("returns 400 when body fields are missing", async () => {
    const res = await request(app).post("/api/auth/signup").send({});
    expect(res.status).toBe(400);
  });
});

// ---------------------------------------------------------------------------
// POST /api/auth/login
// ---------------------------------------------------------------------------
describe("POST /api/auth/login", () => {
  it("returns 200 with user data on valid credentials", async () => {
    (db.select as jest.Mock).mockReturnValueOnce(createQueryChain([MOCK_USER]));
    (bcrypt.compare as jest.Mock).mockResolvedValueOnce(true);

    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "test@example.com", password: "password123" });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ id: 1, email: "test@example.com" });
  });

  it("returns 401 when user does not exist", async () => {
    (db.select as jest.Mock).mockReturnValueOnce(createQueryChain([]));

    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "nobody@example.com", password: "password123" });

    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: "Invalid credentials" });
  });

  it("returns 401 when password is wrong", async () => {
    (db.select as jest.Mock).mockReturnValueOnce(createQueryChain([MOCK_USER]));
    (bcrypt.compare as jest.Mock).mockResolvedValueOnce(false);

    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "test@example.com", password: "wrongpassword" });

    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: "Invalid credentials" });
  });

  it("returns 400 for invalid input", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "bad", password: "x" });

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: "Invalid input" });
  });
});

// ---------------------------------------------------------------------------
// POST /api/auth/logout
// ---------------------------------------------------------------------------
describe("POST /api/auth/logout", () => {
  it("destroys the session and returns ok", async () => {
    const res = await request(authedApp).post("/api/auth/logout");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });
});

// ---------------------------------------------------------------------------
// GET /api/auth/me
// ---------------------------------------------------------------------------
describe("GET /api/auth/me", () => {
  it("returns 401 when not authenticated", async () => {
    const res = await request(app).get("/api/auth/me");
    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: "Not authenticated" });
  });

  it("returns the current user when authenticated", async () => {
    (db.select as jest.Mock).mockReturnValueOnce(
      createQueryChain([{ id: 1, email: "test@example.com" }])
    );

    const res = await request(authedApp).get("/api/auth/me");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ id: 1, email: "test@example.com" });
  });

  it("returns 401 when session userId refers to a deleted user", async () => {
    (db.select as jest.Mock).mockReturnValueOnce(createQueryChain([]));

    const res = await request(authedApp).get("/api/auth/me");
    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: "Not authenticated" });
  });
});
