import request from "supertest";
import { createTestApp } from "../../test-utils/create-test-app";
import { db, createQueryChain } from "../../__mocks__/db";

const app = createTestApp();           // unauthenticated
const authedApp = createTestApp(42);   // authenticated as userId 42

const MOCK_WORKOUT = {
  id: 1,
  userId: 42,
  date: "2024-01-15",
  notes: null,
  createdAt: new Date().toISOString(),
};

const MOCK_SET = {
  id: 10,
  workoutId: 1,
  exerciseName: "Squat",
  weight: 100,
  reps: 5,
  rpe: 8,
  createdAt: new Date().toISOString(),
};

// ---------------------------------------------------------------------------
// GET /api/workouts
// ---------------------------------------------------------------------------
describe("GET /api/workouts", () => {
  it("returns 401 when not authenticated", async () => {
    const res = await request(app).get("/api/workouts");
    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: "Not authenticated" });
  });

  it("returns a list of workouts with sets and computed meta", async () => {
    // First select: list workouts; second: sets for that workout
    (db.select as jest.Mock)
      .mockReturnValueOnce(createQueryChain([MOCK_WORKOUT]))
      .mockReturnValueOnce(createQueryChain([MOCK_SET]));

    const res = await request(authedApp).get("/api/workouts");

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    const [workout] = res.body;
    expect(workout.id).toBe(1);
    expect(workout.sets).toHaveLength(1);
    expect(workout.totalVolume).toBe(500); // 100 * 5
    expect(workout.exerciseCount).toBe(1);
  });

  it("returns an empty list when user has no workouts", async () => {
    (db.select as jest.Mock).mockReturnValueOnce(createQueryChain([]));

    const res = await request(authedApp).get("/api/workouts");
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it("respects limit and offset query params", async () => {
    (db.select as jest.Mock).mockReturnValueOnce(createQueryChain([]));

    const res = await request(authedApp).get("/api/workouts?limit=5&offset=10");
    expect(res.status).toBe(200);
    expect(db.select).toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// POST /api/workouts
// ---------------------------------------------------------------------------
describe("POST /api/workouts", () => {
  it("returns 401 when not authenticated", async () => {
    const res = await request(app)
      .post("/api/workouts")
      .send({ date: "2024-01-15", sets: [] });
    expect(res.status).toBe(401);
  });

  it("creates a workout and returns 201 with sets and meta", async () => {
    // First insert: workout; second insert: sets
    (db.insert as jest.Mock)
      .mockReturnValueOnce(createQueryChain([MOCK_WORKOUT]))
      .mockReturnValueOnce(createQueryChain([MOCK_SET]));

    const res = await request(authedApp)
      .post("/api/workouts")
      .send({
        date: "2024-01-15",
        notes: null,
        sets: [{ exerciseName: "Squat", weight: 100, reps: 5, rpe: 8 }],
      });

    expect(res.status).toBe(201);
    expect(res.body.id).toBe(1);
    expect(res.body.sets).toHaveLength(1);
    expect(res.body.totalVolume).toBe(500);
    expect(res.body.exerciseCount).toBe(1);
  });

  it("returns 400 for invalid body (missing date)", async () => {
    const res = await request(authedApp)
      .post("/api/workouts")
      .send({ sets: [] });
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: "Invalid input" });
  });

  it("returns 400 when sets is not an array", async () => {
    const res = await request(authedApp)
      .post("/api/workouts")
      .send({ date: "2024-01-15", sets: "not-an-array" });
    expect(res.status).toBe(400);
  });

  it("accepts a workout with no notes", async () => {
    (db.insert as jest.Mock)
      .mockReturnValueOnce(createQueryChain([{ ...MOCK_WORKOUT, notes: null }]))
      .mockReturnValueOnce(createQueryChain([]));

    const res = await request(authedApp)
      .post("/api/workouts")
      .send({ date: "2024-01-15", sets: [] });

    expect(res.status).toBe(201);
  });
});

// ---------------------------------------------------------------------------
// GET /api/workouts/:id
// ---------------------------------------------------------------------------
describe("GET /api/workouts/:id", () => {
  it("returns 401 when not authenticated", async () => {
    const res = await request(app).get("/api/workouts/1");
    expect(res.status).toBe(401);
  });

  it("returns a single workout with sets and meta", async () => {
    (db.select as jest.Mock)
      .mockReturnValueOnce(createQueryChain([MOCK_WORKOUT]))
      .mockReturnValueOnce(createQueryChain([MOCK_SET]));

    const res = await request(authedApp).get("/api/workouts/1");

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(1);
    expect(res.body.sets).toHaveLength(1);
    expect(res.body.totalVolume).toBe(500);
  });

  it("returns 404 when workout does not exist or belongs to another user", async () => {
    (db.select as jest.Mock).mockReturnValueOnce(createQueryChain([]));

    const res = await request(authedApp).get("/api/workouts/999");
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: "Not found" });
  });

  it("returns 400 for a non-numeric id", async () => {
    const res = await request(authedApp).get("/api/workouts/abc");
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: "Invalid id" });
  });
});

// ---------------------------------------------------------------------------
// DELETE /api/workouts/:id
// ---------------------------------------------------------------------------
describe("DELETE /api/workouts/:id", () => {
  it("returns 401 when not authenticated", async () => {
    const res = await request(app).delete("/api/workouts/1");
    expect(res.status).toBe(401);
  });

  it("deletes the workout and returns 204", async () => {
    // Ownership check returns the workout
    (db.select as jest.Mock).mockReturnValueOnce(createQueryChain([MOCK_WORKOUT]));
    // Delete resolves (void)
    (db.delete as jest.Mock).mockReturnValueOnce(createQueryChain([]));

    const res = await request(authedApp).delete("/api/workouts/1");
    expect(res.status).toBe(204);
    expect(db.delete).toHaveBeenCalledTimes(1);
  });

  it("returns 404 when workout does not exist or belongs to another user", async () => {
    (db.select as jest.Mock).mockReturnValueOnce(createQueryChain([]));

    const res = await request(authedApp).delete("/api/workouts/999");
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: "Not found" });
  });

  it("returns 400 for a non-numeric id", async () => {
    const res = await request(authedApp).delete("/api/workouts/abc");
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: "Invalid id" });
  });
});
