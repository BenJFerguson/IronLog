import request from "supertest";
import { createTestApp } from "../../test-utils/create-test-app";
import { db, pool, createQueryChain } from "../../__mocks__/db";

const app = createTestApp();         // unauthenticated
const authedApp = createTestApp(1);  // authenticated as userId 1

const MOCK_WORKOUT = {
  id: 1,
  userId: 1,
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
// GET /api/stats/dashboard
// ---------------------------------------------------------------------------
describe("GET /api/stats/dashboard", () => {
  it("returns 401 when not authenticated", async () => {
    const res = await request(app).get("/api/stats/dashboard");
    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: "Not authenticated" });
  });

  it("returns dashboard stats with zeroes when user has no workouts", async () => {
    // allWorkouts select returns empty
    (db.select as jest.Mock).mockReturnValue(createQueryChain([]));

    const res = await request(authedApp).get("/api/stats/dashboard");

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      weeklyWorkoutCount: 0,
      totalWorkouts: 0,
      recentWorkouts: [],
      weeklyVolume: 0,
      allTimeVolume: 0,
    });
  });

  it("computes weekly and all-time volume from sets", async () => {
    const todayStr = new Date().toISOString().split("T")[0];
    const recentWorkout = { ...MOCK_WORKOUT, date: todayStr };

    // The dashboard handler calls db.select multiple times:
    // 1. allWorkouts  2. recentWithSets (per workout)  3+. allSets (per workout)  4+. weeklySets (per workout)
    (db.select as jest.Mock)
      .mockReturnValueOnce(createQueryChain([recentWorkout]))  // allWorkouts
      .mockReturnValueOnce(createQueryChain([MOCK_SET]))       // recentWithSets: workout 1 sets
      .mockReturnValueOnce(createQueryChain([MOCK_SET]))       // allSets: workout 1 sets
      .mockReturnValueOnce(createQueryChain([MOCK_SET]));      // weeklySets: workout 1 sets

    const res = await request(authedApp).get("/api/stats/dashboard");

    expect(res.status).toBe(200);
    expect(res.body.weeklyWorkoutCount).toBe(1);
    expect(res.body.totalWorkouts).toBe(1);
    expect(res.body.allTimeVolume).toBe(500); // 100 * 5
    expect(res.body.weeklyVolume).toBe(500);
    expect(res.body.recentWorkouts).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// GET /api/stats/progress
// ---------------------------------------------------------------------------
describe("GET /api/stats/progress", () => {
  it("returns 401 when not authenticated", async () => {
    const res = await request(app).get("/api/stats/progress?exercise=Squat");
    expect(res.status).toBe(401);
  });

  it("returns 400 when exercise param is missing", async () => {
    const res = await request(authedApp).get("/api/stats/progress");
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: "Exercise query parameter is required" });
  });

  it("returns 400 when exercise param is an empty string", async () => {
    const res = await request(authedApp).get("/api/stats/progress?exercise=");
    expect(res.status).toBe(400);
  });

  it("returns progress data for the given exercise", async () => {
    (pool.query as jest.Mock).mockResolvedValueOnce({
      rows: [
        { workout_date: "2024-01-10", top_weight: "120", total_volume: "600" },
        { workout_date: "2024-01-15", top_weight: "125", total_volume: "625" },
      ],
    });

    const res = await request(authedApp).get("/api/stats/progress?exercise=Squat");

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);
    expect(res.body.data[0]).toEqual({ workoutDate: "2024-01-10", topWeight: 120, totalVolume: 600 });
    expect(res.body.data[1]).toEqual({ workoutDate: "2024-01-15", topWeight: 125, totalVolume: 625 });
  });

  it("returns empty data array when no history exists for the exercise", async () => {
    (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [] });

    const res = await request(authedApp).get("/api/stats/progress?exercise=Unknown%20Exercise");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ data: [] });
  });

  it("passes userId and exercise as parameterised values to prevent SQL injection", async () => {
    (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [] });

    await request(authedApp).get("/api/stats/progress?exercise=Squat");

    expect(pool.query).toHaveBeenCalledWith(
      expect.stringContaining("$1"),
      [1, "Squat"],
    );
  });
});

// ---------------------------------------------------------------------------
// GET /api/stats/last-exercise
// ---------------------------------------------------------------------------
describe("GET /api/stats/last-exercise", () => {
  it("returns 401 when not authenticated", async () => {
    const res = await request(app).get("/api/stats/last-exercise?exercise=Squat");
    expect(res.status).toBe(401);
  });

  it("returns 400 when exercise param is missing", async () => {
    const res = await request(authedApp).get("/api/stats/last-exercise");
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: "Exercise query parameter is required" });
  });

  it("returns null workoutDate and empty sets when no history exists", async () => {
    (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [] });

    const res = await request(authedApp).get("/api/stats/last-exercise?exercise=Squat");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ workoutDate: null, sets: [] });
  });

  it("returns the most recent workout date and its sets", async () => {
    (pool.query as jest.Mock).mockResolvedValueOnce({
      rows: [
        { id: 10, exercise_name: "Squat", weight: "100", reps: "5", rpe: "8", workout_date: "2024-01-15" },
        { id: 11, exercise_name: "Squat", weight: "105", reps: "3", rpe: null, workout_date: "2024-01-15" },
      ],
    });

    const res = await request(authedApp).get("/api/stats/last-exercise?exercise=Squat");

    expect(res.status).toBe(200);
    expect(res.body.workoutDate).toBe("2024-01-15");
    expect(res.body.sets).toHaveLength(2);
    expect(res.body.sets[0]).toEqual({ id: 10, exerciseName: "Squat", weight: 100, reps: 5, rpe: 8 });
    expect(res.body.sets[1]).toEqual({ id: 11, exerciseName: "Squat", weight: 105, reps: 3, rpe: null });
  });

  it("passes userId and exercise as parameterised values to prevent SQL injection", async () => {
    (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [] });

    await request(authedApp).get("/api/stats/last-exercise?exercise=Bench%20Press");

    expect(pool.query).toHaveBeenCalledWith(
      expect.stringContaining("$1"),
      [1, "Bench Press"],
    );
  });
});

// ---------------------------------------------------------------------------
// GET /api/stats/quote
// ---------------------------------------------------------------------------
describe("GET /api/stats/quote", () => {
  const realFetch = global.fetch;

  afterEach(() => {
    global.fetch = realFetch;
  });

  it("returns a quote from the external API when available", async () => {
    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => [{ q: "Train hard.", a: "Unknown" }],
    } as any);

    const res = await request(authedApp).get("/api/stats/quote");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ text: "Train hard.", author: "Unknown" });
  });

  it("falls back to a built-in quote when the external API is unavailable", async () => {
    global.fetch = jest.fn().mockRejectedValueOnce(new Error("Network error"));

    const res = await request(authedApp).get("/api/stats/quote");

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("text");
    expect(res.body).toHaveProperty("author");
  });

  it("falls back when the external API returns a non-ok response", async () => {
    global.fetch = jest.fn().mockResolvedValueOnce({ ok: false } as any);

    const res = await request(authedApp).get("/api/stats/quote");

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("text");
    expect(res.body).toHaveProperty("author");
  });

  it("is publicly accessible without authentication", async () => {
    global.fetch = jest.fn().mockRejectedValueOnce(new Error("timeout"));

    const res = await request(app).get("/api/stats/quote");
    expect(res.status).toBe(200);
  });
});
