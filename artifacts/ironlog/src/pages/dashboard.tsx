import { useLocation } from "wouter";
import { 
  useGetDashboardStats, 
  getGetDashboardStatsQueryKey,
  useGetMotivationalQuote,
  getGetMotivationalQuoteQueryKey
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dumbbell, Activity, CalendarDays, TrendingUp } from "lucide-react";
import { format } from "date-fns";

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const { data: stats, isLoading: statsLoading } = useGetDashboardStats({
    query: { queryKey: getGetDashboardStatsQueryKey() }
  });
  const { data: quote, isLoading: quoteLoading } = useGetMotivationalQuote({
    query: { queryKey: getGetMotivationalQuoteQueryKey() }
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight uppercase">Dashboard</h1>
          <p className="text-muted-foreground">Overview of your lifting progress.</p>
        </div>
        <Button 
          size="lg" 
          onClick={() => setLocation("/workout/new")}
          className="font-bold uppercase tracking-wider"
          data-testid="btn-start-workout"
        >
          <Dumbbell className="mr-2 h-5 w-5" />
          Start Workout
        </Button>
      </div>

      {!quoteLoading && quote && (
        <div className="bg-secondary/50 border border-secondary p-6 rounded-sm border-l-4 border-l-primary">
          <blockquote className="text-lg italic font-medium">"{quote.text}"</blockquote>
          <p className="text-muted-foreground mt-2 text-sm uppercase tracking-wider">— {quote.author}</p>
        </div>
      )}

      {statsLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <Card key={i} className="bg-card border-border animate-pulse h-32"></Card>
          ))}
        </div>
      ) : stats ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-card border-border shadow-md">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium uppercase text-muted-foreground tracking-wider">Weekly Workouts</CardTitle>
              <CalendarDays className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold" data-testid="stat-weekly-workouts">{stats.weeklyWorkoutCount}</div>
            </CardContent>
          </Card>
          <Card className="bg-card border-border shadow-md">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium uppercase text-muted-foreground tracking-wider">Total Workouts</CardTitle>
              <Activity className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold" data-testid="stat-total-workouts">{stats.totalWorkouts}</div>
            </CardContent>
          </Card>
          <Card className="bg-card border-border shadow-md">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium uppercase text-muted-foreground tracking-wider">Weekly Vol (lbs)</CardTitle>
              <TrendingUp className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold" data-testid="stat-weekly-vol">
                {stats.weeklyVolume.toLocaleString()}
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card border-border shadow-md">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium uppercase text-muted-foreground tracking-wider">All Time Vol</CardTitle>
              <Dumbbell className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold" data-testid="stat-alltime-vol">
                {stats.allTimeVolume.toLocaleString()}
              </div>
            </CardContent>
          </Card>
        </div>
      ) : null}

      <div className="space-y-4">
        <h2 className="text-xl font-bold uppercase tracking-wider border-b border-border pb-2">Recent Sessions</h2>
        {stats?.recentWorkouts?.length ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {stats.recentWorkouts.map(workout => (
              <Card key={workout.id} className="bg-card border-border hover:border-primary/50 transition-colors cursor-pointer shadow-md" onClick={() => setLocation('/history')}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">{format(new Date(workout.date), 'MMM d, yyyy')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-sm text-muted-foreground space-y-1">
                    <p><span className="text-foreground font-medium">{workout.exerciseCount}</span> exercises</p>
                    <p><span className="text-foreground font-medium">{workout.sets.length}</span> sets</p>
                    <p><span className="text-foreground font-medium">{workout.totalVolume.toLocaleString()}</span> lbs vol</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center p-8 border border-dashed border-border rounded-sm bg-card/50">
            <p className="text-muted-foreground mb-4">No recent workouts.</p>
            <Button variant="outline" onClick={() => setLocation('/workout/new')}>Log your first session</Button>
          </div>
        )}
      </div>
    </div>
  );
}