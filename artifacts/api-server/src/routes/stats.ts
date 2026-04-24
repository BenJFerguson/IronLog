import { Router } from "express";
import { db, pool, workoutsTable, workoutSetsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { requireAuth } from "../middleware/require-auth";

const router = Router();

router.get("/dashboard", async (req, res) => {
  const userId = requireAuth(req, res);
  if (!userId) return;

  const now = new Date();
  const weekAgo = new Date(now);
  weekAgo.setDate(weekAgo.getDate() - 7);
  // ISO date string used for lexicographic comparison against stored date strings (YYYY-MM-DD)
  const weekAgoStr = weekAgo.toISOString().split("T")[0];

  // Fetch all workouts once and derive weekly/recent slices in memory to avoid multiple round-trips.
  // NOTE: This approach works well for typical user volumes (hundreds of workouts).
  // At very large scale, replace with SQL aggregation queries.
  const allWorkouts = await db
    .select()
    .from(workoutsTable)
    .where(eq(workoutsTable.userId, userId))
    .orderBy(desc(workoutsTable.date));

  const weeklyWorkouts = allWorkouts.filter((w) => w.date >= weekAgoStr);

  const recentWorkouts = allWorkouts.slice(0, 5);
  const recentWithSets = await Promise.all(
    recentWorkouts.map(async (w) => {
      const sets = await db.select().from(workoutSetsTable).where(eq(workoutSetsTable.workoutId, w.id));
      const totalVolume = sets.reduce((sum, s) => sum + s.weight * s.reps, 0);
      const exerciseCount = new Set(sets.map((s) => s.exerciseName)).size;
      return { ...w, sets, totalVolume, exerciseCount };
    })
  );

  const allSets = await Promise.all(
    allWorkouts.map(async (w) => db.select().from(workoutSetsTable).where(eq(workoutSetsTable.workoutId, w.id)))
  );
  const allSetsFlat = allSets.flat();
  const allTimeVolume = allSetsFlat.reduce((sum, s) => sum + s.weight * s.reps, 0);

  const weeklySets = await Promise.all(
    weeklyWorkouts.map(async (w) => db.select().from(workoutSetsTable).where(eq(workoutSetsTable.workoutId, w.id)))
  );
  const weeklyVolume = weeklySets.flat().reduce((sum, s) => sum + s.weight * s.reps, 0);

  res.json({
    weeklyWorkoutCount: weeklyWorkouts.length,
    totalWorkouts: allWorkouts.length,
    recentWorkouts: recentWithSets,
    weeklyVolume,
    allTimeVolume,
  });
});

router.get("/progress", async (req, res) => {
  const userId = requireAuth(req, res);
  if (!userId) return;

  const exercise = String(req.query.exercise || "").trim();
  if (!exercise) {
    res.status(400).json({ error: "Exercise query parameter is required" });
    return;
  }

  // Aggregated per-workout stats for a single exercise, ordered chronologically for charting.
  // Uses raw SQL for GROUP BY aggregation that Drizzle's ORM layer doesn't express cleanly.
  const result = await pool.query(
    `
    SELECT w.date AS workout_date,
           MAX(ws.weight) AS top_weight,
           SUM(ws.weight * ws.reps) AS total_volume
    FROM workouts w
    JOIN workout_sets ws ON ws.workout_id = w.id
    WHERE w.user_id = $1 AND ws.exercise_name = $2
    GROUP BY w.date
    ORDER BY w.date
    `,
    [userId, exercise],
  );

  // pg driver returns numeric columns as strings; coerce them explicitly.
  const data = result.rows.map((row: any) => ({
    workoutDate:
      typeof row.workout_date === "string"
        ? row.workout_date
        : row.workout_date.toISOString().split("T")[0],
    topWeight: Number(row.top_weight ?? 0),
    totalVolume: Number(row.total_volume ?? 0),
  }));

  res.json({ data });
});

router.get("/last-exercise", async (req, res) => {
  const userId = requireAuth(req, res);
  if (!userId) return;

  const exercise = String(req.query.exercise || "").trim();
  if (!exercise) {
    res.status(400).json({ error: "Exercise query parameter is required" });
    return;
  }

  // Fetches all sets from the most recent workout that includes this exercise.
  // The correlated subquery pins to the single latest workout_id to avoid mixing sets
  // from different dates when the same exercise appears across multiple workouts on the same date.
  const result = await pool.query(
    `
    SELECT ws.id,
           ws.exercise_name,
           ws.weight,
           ws.reps,
           ws.rpe,
           w.date AS workout_date
    FROM workout_sets ws
    JOIN workouts w ON ws.workout_id = w.id
    WHERE w.user_id = $1 AND ws.exercise_name = $2
      AND w.id = (
        SELECT w2.id
        FROM workouts w2
        JOIN workout_sets ws2 ON ws2.workout_id = w2.id
        WHERE w2.user_id = $1 AND ws2.exercise_name = $2
        ORDER BY w2.date DESC, w2.id DESC
        LIMIT 1
      )
    ORDER BY ws.id ASC
    `,
    [userId, exercise],
  );

  if (result.rows.length === 0) {
    res.json({ workoutDate: null, sets: [] });
    return;
  }

  const workoutDate =
    typeof result.rows[0].workout_date === "string"
      ? result.rows[0].workout_date
      : result.rows[0].workout_date.toISOString().split("T")[0];

  const sets = result.rows.map((row: any) => ({
    id: row.id,
    exerciseName: row.exercise_name,
    weight: Number(row.weight ?? 0),
    reps: Number(row.reps ?? 0),
    rpe: row.rpe === null ? null : Number(row.rpe),
  }));

  res.json({ workoutDate, sets });
});

const fallbackQuotes = [
  { text: "The pain of discipline is far less than the pain of regret.", author: "Unknown" },
  { text: "Strength does not come from physical capacity. It comes from an indomitable will.", author: "Mahatma Gandhi" },
  { text: "The last three or four reps is what makes the muscle grow.", author: "Arnold Schwarzenegger" },
  { text: "No pain, no gain. Shut up and train.", author: "Unknown" },
  { text: "The body achieves what the mind believes.", author: "Napoleon Hill" },
];

router.get("/quote", async (_req, res) => {
  try {
    const response = await fetch("https://zenquotes.io/api/random", {
      signal: AbortSignal.timeout(3000),
    });
    if (response.ok) {
      const data = await response.json() as Array<{ q: string; a: string }>;
      if (data?.[0]) {
        res.json({ text: data[0].q, author: data[0].a });
        return;
      }
    }
  } catch {
    // External API unavailable — fall through to bundled fallback quotes
  }
  const quote = fallbackQuotes[Math.floor(Math.random() * fallbackQuotes.length)];
  res.json(quote);
});

export default router;
