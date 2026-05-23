"use client";

import { useState } from "react";
import { Activity, Loader2, Pencil, Target, Trophy } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  useUpdateGoal,
  type ExerciseSummary,
} from "@/hooks/useExercise";

interface GoalCardProps {
  summary: ExerciseSummary | undefined;
  isLoading: boolean;
}

export function GoalCard({ summary, isLoading }: GoalCardProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<string>("");
  const updateGoal = useUpdateGoal();

  const startEdit = () => {
    setDraft(String(summary?.weekly_target_minutes ?? 150));
    setEditing(true);
  };

  const save = () => {
    const n = Number(draft);
    if (!Number.isFinite(n) || n < 0) return;
    updateGoal.mutate(Math.round(n), {
      onSuccess: () => setEditing(false),
    });
  };

  if (isLoading || !summary) {
    return (
      <div className="rounded-[12px] border border-rule bg-paper p-5 md:p-6">
        <Loader2 className="h-5 w-5 animate-spin text-ink-mute" />
      </div>
    );
  }

  const pct = Math.min(100, summary.weekly_progress_pct);
  const isMet = summary.weekly_progress_pct >= 100;

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <StatCard
        icon={<Activity className="h-4 w-4 text-forest-deep" />}
        label="This week"
        value={`${summary.this_week_minutes} min`}
      />

      <div className="rounded-[12px] border border-rule bg-paper p-5">
        <div className="mb-2 flex items-center justify-between">
          <div className="flex items-center gap-2 text-[12px] font-medium uppercase tracking-[0.18em] text-ink-mute">
            <Target className="h-4 w-4 text-forest-deep" /> Weekly target
          </div>
          {!editing && (
            <button
              onClick={startEdit}
              className="text-ink-mute hover:text-primary"
              aria-label="Edit goal"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {editing ? (
          <div className="flex items-center gap-2">
            <Input
              type="number"
              min={0}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              className="h-9 w-24"
            />
            <span className="text-[12px] text-ink-soft">min/wk</span>
            <Button
              size="sm"
              onClick={save}
              disabled={updateGoal.isPending}
              className="ml-auto"
            >
              {updateGoal.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                "Save"
              )}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setEditing(false)}
            >
              Cancel
            </Button>
          </div>
        ) : (
          <>
            <p className="text-[22px] font-semibold text-primary">
              {summary.weekly_target_minutes} min
            </p>
            <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-cream-2">
              <div
                className={`h-full rounded-full transition-all ${
                  isMet ? "bg-emerald-500" : "bg-forest-deep"
                }`}
                style={{ width: `${pct}%` }}
              />
            </div>
            <p className="mt-2 text-[12px] text-ink-soft">
              {summary.weekly_progress_pct.toFixed(0)}% of goal
            </p>
          </>
        )}
      </div>

      <StatCard
        icon={
          isMet ? (
            <Trophy className="h-4 w-4 text-emerald-600" />
          ) : (
            <Activity className="h-4 w-4 text-forest-deep" />
          )
        }
        label="Total logs"
        value={String(summary.total_logs)}
        accent={
          isMet ? "Goal met — nice work!" : "Keep going to hit your weekly goal"
        }
      />
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  accent?: string;
}) {
  return (
    <div className="rounded-[12px] border border-rule bg-paper p-5">
      <div className="mb-2 flex items-center gap-2 text-[12px] font-medium uppercase tracking-[0.18em] text-ink-mute">
        {icon} {label}
      </div>
      <p className="text-[22px] font-semibold text-primary">{value}</p>
      {accent && <p className="mt-2 text-[12px] text-ink-soft">{accent}</p>}
    </div>
  );
}
