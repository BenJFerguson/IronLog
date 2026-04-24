import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useCreateWorkout, getListWorkoutsQueryKey, getGetDashboardStatsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trash2, Plus, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { PRESET_EXERCISES } from "@/lib/exercises";

interface SetEntry {
  exerciseName: string;
  weight: number;
  reps: number;
  rpe: number | null;
}

export default function WorkoutNew() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [exerciseSelect, setExerciseSelect] = useState<string>("Squat");
  const [customExercise, setCustomExercise] = useState("");
  const [useCustom, setUseCustom] = useState(false);
  const [weight, setWeight] = useState("");
  const [reps, setReps] = useState("");
  const [rpe, setRpe] = useState("");
  const [notes, setNotes] = useState("");
  const [loggedSets, setLoggedSets] = useState<SetEntry[]>([]);
  const [previousWorkout, setPreviousWorkout] = useState<{
    workoutDate: string;
    sets: SetEntry[];
  } | null>(null);
  const [previousLoading, setPreviousLoading] = useState(false);
  const [previousError, setPreviousError] = useState<string | null>(null);

  const createWorkout = useCreateWorkout();

  const currentExercise = useCustom ? customExercise : exerciseSelect;

  useEffect(() => {
    const exerciseName = currentExercise.trim();
    const controller = new AbortController();

    if (!exerciseName) {
      setPreviousWorkout(null);
      setPreviousError(null);
      setPreviousLoading(false);
      return;
    }

    setPreviousLoading(true);
    setPreviousError(null);
    setPreviousWorkout(null);

    fetch(`/api/stats/last-exercise?exercise=${encodeURIComponent(exerciseName)}`, {
      signal: controller.signal,
      cache: "no-cache",
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("Failed to load previous exercise data.");
        }
        return response.json();
      })
      .then((data) => {
        setPreviousWorkout(data ?? null);
      })
      .catch((error) => {
        if (controller.signal.aborted) return;
        setPreviousError(error instanceof Error ? error.message : "Unable to load previous exercise data.");
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setPreviousLoading(false);
        }
      });

    return () => controller.abort();
  }, [currentExercise]);

  const handleLogSet = () => {
    const w = parseFloat(weight);
    const r = parseInt(reps);
    const rpeVal = rpe ? parseFloat(rpe) : null;

    if (!currentExercise.trim()) {
      toast({ title: "Exercise name required", variant: "destructive" });
      return;
    }
    if (isNaN(w) || w <= 0) {
      toast({ title: "Valid weight required", variant: "destructive" });
      return;
    }
    if (isNaN(r) || r <= 0) {
      toast({ title: "Valid reps required", variant: "destructive" });
      return;
    }

    setLoggedSets((prev) => [
      ...prev,
      { exerciseName: currentExercise.trim(), weight: w, reps: r, rpe: rpeVal },
    ]);
    setWeight("");
    setReps("");
    setRpe("");
    toast({ title: `Set logged: ${currentExercise} — ${w}lbs x ${r}` });
  };

  const handleRemoveSet = (index: number) => {
    setLoggedSets((prev) => prev.filter((_, i) => i !== index));
  };

  const handleFinish = () => {
    if (loggedSets.length === 0) {
      toast({ title: "Log at least one set before saving", variant: "destructive" });
      return;
    }
    const today = new Date().toISOString().split("T")[0];
    createWorkout.mutate(
      {
        data: {
          date: today,
          notes: notes || null,
          sets: loggedSets,
        },
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListWorkoutsQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetDashboardStatsQueryKey() });
          toast({ title: "Workout saved!" });
          setLocation("/history");
        },
        onError: () => {
          toast({ title: "Failed to save workout", variant: "destructive" });
        },
      }
    );
  };

  const groupedSets = loggedSets.reduce<Record<string, SetEntry[]>>((acc, set, idx) => {
    const key = set.exerciseName;
    if (!acc[key]) acc[key] = [];
    acc[key].push(set);
    return acc;
  }, {});

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight uppercase">Active Workout</h1>
        <p className="text-muted-foreground">Log your sets as you complete them.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-6">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-sm uppercase tracking-wider text-muted-foreground">Add Set</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-wider text-muted-foreground">Exercise</label>
                {!useCustom ? (
                  <Select value={exerciseSelect} onValueChange={setExerciseSelect}>
                    <SelectTrigger data-testid="select-exercise" className="bg-background border-border">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PRESET_EXERCISES.map((ex) => (
                        <SelectItem key={ex} value={ex}>
                          {ex}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    data-testid="input-custom-exercise"
                    placeholder="Exercise name..."
                    value={customExercise}
                    onChange={(e) => setCustomExercise(e.target.value)}
                    className="bg-background border-border"
                  />
                )}
                <button
                  type="button"
                  onClick={() => setUseCustom((v) => !v)}
                  className="text-xs text-primary hover:underline"
                  data-testid="btn-toggle-custom-exercise"
                >
                  {useCustom ? "Use preset exercise" : "Custom exercise"}
                </button>

                <div className="rounded-3xl border border-border/70 bg-background/80 p-4 mt-4">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Last time</p>
                  {previousLoading ? (
                    <div className="text-sm text-muted-foreground">Loading previous workout…</div>
                  ) : previousError ? (
                    <div className="text-sm text-destructive">{previousError}</div>
                  ) : previousWorkout?.sets.length ? (
                    <div className="space-y-3">
                      <div className="text-sm text-muted-foreground">{previousWorkout.workoutDate}</div>
                      <div className="space-y-2">
                        {previousWorkout.sets.map((set, index) => (
                          <div key={index} className="flex items-center gap-3 text-sm text-foreground">
                            <span className="font-medium">{set.weight} lbs</span>
                            <span>{set.reps} reps</span>
                            <span>{set.rpe !== null ? `RPE ${set.rpe}` : "RPE -"}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground">No previous data</div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-2">
                  <label className="text-xs uppercase tracking-wider text-muted-foreground">Weight (lbs)</label>
                  <Input
                    data-testid="input-weight"
                    type="number"
                    min="0"
                    step="2.5"
                    placeholder="135"
                    value={weight}
                    onChange={(e) => setWeight(e.target.value)}
                    className="bg-background border-border"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs uppercase tracking-wider text-muted-foreground">Reps</label>
                  <Input
                    data-testid="input-reps"
                    type="number"
                    min="1"
                    placeholder="5"
                    value={reps}
                    onChange={(e) => setReps(e.target.value)}
                    className="bg-background border-border"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs uppercase tracking-wider text-muted-foreground">RPE (opt)</label>
                  <Input
                    data-testid="input-rpe"
                    type="number"
                    min="1"
                    max="10"
                    step="0.5"
                    placeholder="8"
                    value={rpe}
                    onChange={(e) => setRpe(e.target.value)}
                    className="bg-background border-border"
                  />
                </div>
              </div>

              <Button
                data-testid="btn-log-set"
                onClick={handleLogSet}
                className="w-full font-bold uppercase tracking-wider"
              >
                <Plus className="mr-2 h-4 w-4" />
                Log Set
              </Button>

              <div className="space-y-2">
                <label className="text-xs uppercase tracking-wider text-muted-foreground">Notes (optional)</label>
                <textarea
                  data-testid="input-notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Workout notes..."
                  rows={2}
                  className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </CardContent>
          </Card>

          <Button
            data-testid="btn-finish-workout"
            variant="outline"
            onClick={handleFinish}
            disabled={createWorkout.isPending || loggedSets.length === 0}
            className="w-full font-bold uppercase tracking-wider border-primary text-primary hover:bg-primary hover:text-primary-foreground"
          >
            <CheckCircle className="mr-2 h-4 w-4" />
            {createWorkout.isPending ? "Saving..." : `Finish & Save (${loggedSets.length} sets)`}
          </Button>
        </div>

        <div className="space-y-4">
          <h2 className="text-sm uppercase tracking-wider text-muted-foreground font-medium">
            Session Log — {loggedSets.length} set{loggedSets.length !== 1 ? "s" : ""}
          </h2>
          {loggedSets.length === 0 ? (
            <div className="border border-dashed border-border rounded-md p-8 text-center text-muted-foreground text-sm">
              No sets logged yet. Add your first set.
            </div>
          ) : (
            <div className="space-y-4">
              {Object.entries(groupedSets).map(([exercise, sets]) => (
                <Card key={exercise} className="bg-card border-border">
                  <CardHeader className="py-3 px-4">
                    <CardTitle className="text-base font-bold uppercase tracking-wide">{exercise}</CardTitle>
                  </CardHeader>
                  <CardContent className="px-4 pb-4 pt-0 space-y-2">
                    {sets.map((set, i) => {
                      const globalIdx = loggedSets.findIndex(
                        (s, idx) =>
                          s.exerciseName === exercise &&
                          loggedSets
                            .slice(0, idx + 1)
                            .filter((x) => x.exerciseName === exercise).length ===
                            i + 1
                      );
                      return (
                        <div
                          key={i}
                          className="flex items-center justify-between text-sm py-1 border-b border-border/50 last:border-0"
                          data-testid={`logged-set-${globalIdx}`}
                        >
                          <span>
                            Set {i + 1}: <span className="font-bold text-foreground">{set.weight}lbs</span> x{" "}
                            <span className="font-bold text-foreground">{set.reps}</span> reps
                            {set.rpe !== null && (
                              <span className="text-muted-foreground ml-2">@ RPE {set.rpe}</span>
                            )}
                          </span>
                          <button
                            onClick={() => handleRemoveSet(globalIdx)}
                            className="text-muted-foreground hover:text-destructive transition-colors ml-3"
                            data-testid={`btn-remove-set-${globalIdx}`}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
