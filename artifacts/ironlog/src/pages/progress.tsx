import { useEffect, useMemo, useState } from "react";
import { LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChartContainer, ChartTooltip, ChartLegend } from "@/components/ui/chart";
import { PRESET_EXERCISES } from "@/lib/exercises";

interface ProgressPoint {
  workoutDate: string;
  topWeight: number;
  totalVolume: number;
}

export default function ProgressPage() {
  const [selectedExercise, setSelectedExercise] = useState<string>(PRESET_EXERCISES[0]);
  const [progressData, setProgressData] = useState<ProgressPoint[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const chartConfig = useMemo(
    () => ({
      topWeight: { label: "Top Weight", color: "#38bdf8" },
      totalVolume: { label: "Total Volume", color: "#a78bfa" },
    }),
    []
  );

  useEffect(() => {
    const controller = new AbortController();
    const fetchProgress = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const url = new URL("/api/stats/progress", window.location.origin);
        url.searchParams.set("exercise", selectedExercise);

        const response = await fetch(url.toString(), {
          signal: controller.signal,
          cache: "no-cache",
        });

        if (!response.ok) {
          throw new Error("Failed to load progress data.");
        }

        const data = (await response.json()) as { data: ProgressPoint[] };
        setProgressData(data.data);
      } catch (err) {
        if (controller.signal.aborted) return;
        setError(err instanceof Error ? err.message : "Unable to load progress.");
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    };

    fetchProgress();

    return () => controller.abort();
  }, [selectedExercise]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight uppercase">Progress</h1>
        <p className="text-muted-foreground">Track your top weight and volume trends for repeated exercises.</p>
      </div>

      <Card className="bg-card border-border">
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <CardTitle className="text-lg uppercase tracking-wide">Exercise Progress</CardTitle>
            <p className="text-sm text-muted-foreground">Choose an exercise to see how your lifts have changed over time.</p>
          </div>
          <div className="min-w-[220px]">
            <label className="mb-2 block text-xs uppercase tracking-widest text-muted-foreground">Exercise</label>
            <Select value={selectedExercise} onValueChange={setSelectedExercise}>
              <SelectTrigger className="bg-background border-border w-full">
                <SelectValue placeholder="Select exercise" />
              </SelectTrigger>
              <SelectContent>
                {PRESET_EXERCISES.map((exercise) => (
                  <SelectItem key={exercise} value={exercise}>
                    {exercise}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {error ? (
            <div className="rounded-md border border-destructive/40 bg-destructive/10 p-6 text-sm text-destructive">
              {error}
            </div>
          ) : null}

          <div className="grid gap-6 xl:grid-cols-2">
            <div className="rounded-3xl border border-border bg-card p-4">
              <div className="flex items-center justify-between gap-4 mb-4">
                <div>
                  <p className="text-sm uppercase tracking-wider text-muted-foreground">Top Weight</p>
                  <h2 className="text-xl font-bold text-foreground">{selectedExercise}</h2>
                </div>
                <span className="text-xs uppercase tracking-widest text-muted-foreground">lbs</span>
              </div>
              {isLoading ? (
                <div className="h-72 rounded-3xl bg-secondary/20" />
              ) : progressData.length ? (
                <ChartContainer config={chartConfig} className="h-72">
                  <LineChart data={progressData} margin={{ top: 16, right: 16, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.2)" />
                    <XAxis dataKey="workoutDate" stroke="#94a3b8" tick={{ fill: "#94a3b8", fontSize: 12 }} />
                    <YAxis stroke="#94a3b8" tick={{ fill: "#94a3b8", fontSize: 12 }} />
                    <Tooltip content={<ChartTooltip />} />
                    <ChartLegend verticalAlign="top" height={36} />
                    <Line
                      type="monotone"
                      dataKey="topWeight"
                      stroke="var(--color-topWeight)"
                      strokeWidth={3}
                      dot={{ r: 4, strokeWidth: 2, fill: "#fff" }}
                    />
                  </LineChart>
                </ChartContainer>
              ) : (
                <div className="rounded-3xl border border-dashed border-border/40 p-8 text-center text-sm text-muted-foreground">
                  No top weight data yet for {selectedExercise}. Log a workout to start tracking progress.
                </div>
              )}
            </div>

            <div className="rounded-3xl border border-border bg-card p-4">
              <div className="flex items-center justify-between gap-4 mb-4">
                <div>
                  <p className="text-sm uppercase tracking-wider text-muted-foreground">Total Volume</p>
                  <h2 className="text-xl font-bold text-foreground">Per Workout</h2>
                </div>
                <span className="text-xs uppercase tracking-widest text-muted-foreground">lbs</span>
              </div>
              {isLoading ? (
                <div className="h-72 rounded-3xl bg-secondary/20" />
              ) : progressData.length ? (
                <ChartContainer config={chartConfig} className="h-72">
                  <LineChart data={progressData} margin={{ top: 16, right: 16, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.2)" />
                    <XAxis dataKey="workoutDate" stroke="#94a3b8" tick={{ fill: "#94a3b8", fontSize: 12 }} />
                    <YAxis stroke="#94a3b8" tick={{ fill: "#94a3b8", fontSize: 12 }} />
                    <Tooltip content={<ChartTooltip />} />
                    <ChartLegend verticalAlign="top" height={36} />
                    <Line
                      type="monotone"
                      dataKey="totalVolume"
                      stroke="var(--color-totalVolume)"
                      strokeWidth={3}
                      dot={{ r: 4, strokeWidth: 2, fill: "#fff" }}
                    />
                  </LineChart>
                </ChartContainer>
              ) : (
                <div className="rounded-3xl border border-dashed border-border/40 p-8 text-center text-sm text-muted-foreground">
                  No volume data yet for {selectedExercise}. Add a workout and refresh to track volume.
                </div>
              )}
            </div>
          </div>

          <div className="rounded-3xl border border-border bg-card p-4 text-sm text-muted-foreground">
            <p className="mb-2">Workout dates are grouped by workout session and sorted chronologically.</p>
            <p>The top weight line shows the heaviest lift for the selected exercise on each day. The total volume line shows the sum of weight × reps for that exercise per workout.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
