import { useState } from "react";
import { useListWorkouts } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronDown, ChevronUp, Calendar, Dumbbell, BarChart2 } from "lucide-react";
import { format } from "date-fns";

export default function History() {
  const { data: workouts, isLoading } = useListWorkouts({ limit: 50, offset: 0 });
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const toggleExpand = (id: number) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight uppercase">History</h1>
        <p className="text-muted-foreground">All past workouts.</p>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-20 bg-card border border-border rounded-md animate-pulse" />
          ))}
        </div>
      ) : !workouts?.length ? (
        <div className="border border-dashed border-border rounded-md p-12 text-center text-muted-foreground">
          No workouts logged yet. Start your first session.
        </div>
      ) : (
        <div className="space-y-3">
          {workouts.map((workout) => (
            <Card
              key={workout.id}
              className="bg-card border-border overflow-hidden"
              data-testid={`workout-card-${workout.id}`}
            >
              <CardHeader
                className="cursor-pointer py-4 px-5 hover:bg-secondary/30 transition-colors"
                onClick={() => toggleExpand(workout.id)}
                data-testid={`workout-toggle-${workout.id}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2 text-primary font-bold">
                      <Calendar size={16} />
                      <span className="text-foreground">
                        {format(new Date(workout.date), "MMM d, yyyy")}
                      </span>
                    </div>
                    <div className="hidden sm:flex items-center gap-5 text-sm text-muted-foreground">
                      <span>
                        <span className="font-bold text-foreground">{workout.exerciseCount}</span>{" "}
                        exercise{workout.exerciseCount !== 1 ? "s" : ""}
                      </span>
                      <span>
                        <span className="font-bold text-foreground">{workout.sets.length}</span>{" "}
                        sets
                      </span>
                      <span>
                        <span className="font-bold text-primary">
                          {workout.totalVolume.toLocaleString()}
                        </span>{" "}
                        lbs
                      </span>
                    </div>
                  </div>
                  {expandedId === workout.id ? (
                    <ChevronUp size={18} className="text-muted-foreground" />
                  ) : (
                    <ChevronDown size={18} className="text-muted-foreground" />
                  )}
                </div>
                <div className="flex sm:hidden items-center gap-4 text-sm text-muted-foreground mt-2">
                  <span>
                    <span className="font-bold text-foreground">{workout.exerciseCount}</span> exercises
                  </span>
                  <span>
                    <span className="font-bold text-foreground">{workout.sets.length}</span> sets
                  </span>
                  <span>
                    <span className="font-bold text-primary">{workout.totalVolume.toLocaleString()}</span> lbs
                  </span>
                </div>
              </CardHeader>

              {expandedId === workout.id && (
                <CardContent className="px-5 pb-5 pt-0 border-t border-border">
                  {workout.notes && (
                    <p className="text-sm text-muted-foreground italic mb-4 pt-4">
                      {workout.notes}
                    </p>
                  )}
                  {(() => {
                    const byExercise = workout.sets.reduce<Record<string, typeof workout.sets>>(
                      (acc, set) => {
                        if (!acc[set.exerciseName]) acc[set.exerciseName] = [];
                        acc[set.exerciseName].push(set);
                        return acc;
                      },
                      {}
                    );
                    return (
                      <div className="space-y-4 pt-4">
                        {Object.entries(byExercise).map(([exercise, sets]) => (
                          <div key={exercise}>
                            <div className="flex items-center gap-2 mb-2">
                              <Dumbbell size={14} className="text-primary" />
                              <h3 className="font-bold uppercase text-sm tracking-wide">{exercise}</h3>
                            </div>
                            <div className="space-y-1 ml-5">
                              {sets.map((set, i) => (
                                <div
                                  key={set.id}
                                  className="flex items-center gap-4 text-sm py-1 border-b border-border/40 last:border-0"
                                  data-testid={`history-set-${set.id}`}
                                >
                                  <span className="text-muted-foreground w-14">Set {i + 1}</span>
                                  <span>
                                    <span className="font-bold">{set.weight}</span>
                                    <span className="text-muted-foreground"> lbs</span>
                                  </span>
                                  <span>
                                    <span className="font-bold">{set.reps}</span>
                                    <span className="text-muted-foreground"> reps</span>
                                  </span>
                                  {set.rpe !== null && (
                                    <span className="text-muted-foreground">
                                      @ RPE <span className="font-bold text-foreground">{set.rpe}</span>
                                    </span>
                                  )}
                                  <span className="text-muted-foreground ml-auto">
                                    <BarChart2 size={12} className="inline mr-1" />
                                    {(set.weight * set.reps).toLocaleString()} lbs
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
