import { Router } from "express";
import { db, workoutsTable, workoutSetsTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { CreateWorkoutBody, ListWorkoutsQueryParams, GetWorkoutParams, DeleteWorkoutParams } from "@workspace/api-zod";

const router = Router();

function requireAuth(req: any, res: any): number | null {
  const userId = req.session?.userId;
  if (!userId) {
    res.status(401).json({ error: "Not authenticated" });
    return null;
  }
  return userId as number;
}

function computeWorkoutMeta(sets: { weight: number; reps: number }[]) {
  const totalVolume = sets.reduce((sum, s) => sum + s.weight * s.reps, 0);
  const exerciseNames = new Set(sets.map((s: any) => s.exerciseName));
  return { totalVolume, exerciseCount: exerciseNames.size };
}

router.get("/", async (req, res) => {
  const userId = requireAuth(req, res);
  if (!userId) return;

  const queryParsed = ListWorkoutsQueryParams.safeParse(req.query);
  const limit = queryParsed.success ? (queryParsed.data.limit ?? 20) : 20;
  const offset = queryParsed.success ? (queryParsed.data.offset ?? 0) : 0;

  const workouts = await db
    .select()
    .from(workoutsTable)
    .where(eq(workoutsTable.userId, userId))
    .orderBy(desc(workoutsTable.date))
    .limit(limit)
    .offset(offset);

  const result = await Promise.all(
    workouts.map(async (w) => {
      const sets = await db.select().from(workoutSetsTable).where(eq(workoutSetsTable.workoutId, w.id));
      const { totalVolume, exerciseCount } = computeWorkoutMeta(sets);
      return { ...w, sets, totalVolume, exerciseCount };
    })
  );

  res.json(result);
});

router.post("/", async (req, res) => {
  const userId = requireAuth(req, res);
  if (!userId) return;

  const parsed = CreateWorkoutBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }

  const { date, notes, sets } = parsed.data;

  const [workout] = await db
    .insert(workoutsTable)
    .values({ userId, date, notes: notes ?? null })
    .returning();

  const insertedSets = await db
    .insert(workoutSetsTable)
    .values(
      sets.map((s) => ({
        workoutId: workout.id,
        exerciseName: s.exerciseName,
        weight: s.weight,
        reps: s.reps,
        rpe: s.rpe ?? null,
      }))
    )
    .returning();

  const { totalVolume, exerciseCount } = computeWorkoutMeta(insertedSets);
  res.status(201).json({ ...workout, sets: insertedSets, totalVolume, exerciseCount });
});

router.get("/:id", async (req, res) => {
  const userId = requireAuth(req, res);
  if (!userId) return;

  const parsed = GetWorkoutParams.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const { id } = parsed.data;

  const [workout] = await db
    .select()
    .from(workoutsTable)
    .where(and(eq(workoutsTable.id, id), eq(workoutsTable.userId, userId)))
    .limit(1);

  if (!workout) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  const sets = await db.select().from(workoutSetsTable).where(eq(workoutSetsTable.workoutId, id));
  const { totalVolume, exerciseCount } = computeWorkoutMeta(sets);
  res.json({ ...workout, sets, totalVolume, exerciseCount });
});

router.delete("/:id", async (req, res) => {
  const userId = requireAuth(req, res);
  if (!userId) return;

  const parsed = DeleteWorkoutParams.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const { id } = parsed.data;

  const [workout] = await db
    .select()
    .from(workoutsTable)
    .where(and(eq(workoutsTable.id, id), eq(workoutsTable.userId, userId)))
    .limit(1);

  if (!workout) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  await db.delete(workoutsTable).where(eq(workoutsTable.id, id));
  res.status(204).send();
});

export default router;
