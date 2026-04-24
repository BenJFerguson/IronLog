import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function epley(weight: number, reps: number) {
  if (reps === 1) return weight;
  return weight * (1 + reps / 30);
}

function brzycki(weight: number, reps: number) {
  if (reps === 1) return weight;
  return weight * (36 / (37 - reps));
}

function lombardi(weight: number, reps: number) {
  if (reps === 1) return weight;
  return weight * Math.pow(reps, 0.1);
}

const PERCENTAGES = [100, 95, 90, 85, 80, 75, 70, 65, 60];

export default function Calculator() {
  const [weight, setWeight] = useState("");
  const [reps, setReps] = useState("");
  const [results, setResults] = useState<{
    epley: number;
    brzycki: number;
    lombardi: number;
    avg: number;
  } | null>(null);

  const handleCalculate = () => {
    const w = parseFloat(weight);
    const r = parseInt(reps);
    if (isNaN(w) || w <= 0 || isNaN(r) || r <= 0 || r > 36) return;
    const e = epley(w, r);
    const b = brzycki(w, r);
    const l = lombardi(w, r);
    setResults({ epley: e, brzycki: b, lombardi: l, avg: (e + b + l) / 3 });
  };

  const fmt = (n: number) => Math.round(n * 10) / 10;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight uppercase">1RM Calculator</h1>
        <p className="text-muted-foreground">Estimate your one-rep max from a submaximal lift.</p>
      </div>

      <Card className="bg-card border-border max-w-md">
        <CardHeader>
          <CardTitle className="text-sm uppercase tracking-wider text-muted-foreground">Input</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs uppercase tracking-wider text-muted-foreground">Weight (lbs)</label>
              <Input
                data-testid="input-calc-weight"
                type="number"
                min="1"
                step="2.5"
                placeholder="225"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                className="bg-background border-border"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs uppercase tracking-wider text-muted-foreground">Reps</label>
              <Input
                data-testid="input-calc-reps"
                type="number"
                min="1"
                max="36"
                placeholder="5"
                value={reps}
                onChange={(e) => setReps(e.target.value)}
                className="bg-background border-border"
              />
            </div>
          </div>
          <Button
            data-testid="btn-calculate"
            onClick={handleCalculate}
            className="w-full font-bold uppercase tracking-wider"
          >
            Calculate 1RM
          </Button>
        </CardContent>
      </Card>

      {results && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl">
            {[
              { label: "Epley", value: results.epley, formula: "w × (1 + r/30)" },
              { label: "Brzycki", value: results.brzycki, formula: "w × 36/(37-r)" },
              { label: "Lombardi", value: results.lombardi, formula: "w × r^0.1" },
            ].map((formula) => (
              <Card key={formula.label} className="bg-card border-border">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs uppercase tracking-wider text-muted-foreground">
                    {formula.label}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div
                    className="text-2xl font-bold text-primary"
                    data-testid={`result-${formula.label.toLowerCase()}`}
                  >
                    {fmt(formula.value)} lbs
                  </div>
                  <div className="text-xs text-muted-foreground mt-1 font-mono">{formula.formula}</div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="max-w-2xl">
            <h2 className="text-sm uppercase tracking-wider text-muted-foreground font-medium mb-4 border-b border-border pb-2">
              Percentage Table (Avg: {fmt(results.avg)} lbs)
            </h2>
            <div className="overflow-hidden rounded-md border border-border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-secondary/50">
                    <th className="text-left px-4 py-2 text-xs uppercase tracking-wider text-muted-foreground font-medium">
                      %
                    </th>
                    <th className="text-left px-4 py-2 text-xs uppercase tracking-wider text-muted-foreground font-medium">
                      Epley
                    </th>
                    <th className="text-left px-4 py-2 text-xs uppercase tracking-wider text-muted-foreground font-medium">
                      Brzycki
                    </th>
                    <th className="text-left px-4 py-2 text-xs uppercase tracking-wider text-muted-foreground font-medium">
                      Lombardi
                    </th>
                    <th className="text-left px-4 py-2 text-xs uppercase tracking-wider text-muted-foreground font-medium">
                      Avg
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {PERCENTAGES.map((pct, i) => (
                    <tr
                      key={pct}
                      className={`border-t border-border ${i % 2 === 0 ? "bg-card" : "bg-secondary/20"} ${pct === 100 ? "border-l-2 border-l-primary" : ""}`}
                      data-testid={`pct-row-${pct}`}
                    >
                      <td className="px-4 py-2 font-bold text-primary">{pct}%</td>
                      <td className="px-4 py-2">{fmt(results.epley * pct / 100)}</td>
                      <td className="px-4 py-2">{fmt(results.brzycki * pct / 100)}</td>
                      <td className="px-4 py-2">{fmt(results.lombardi * pct / 100)}</td>
                      <td className="px-4 py-2 font-bold">{fmt(results.avg * pct / 100)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
