"use client";

import { useState } from "react";
import { Loader2, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCreateLog, type Intensity } from "@/hooks/useExercise";

const ACTIVITY_SUGGESTIONS = [
  "Running",
  "Walking",
  "Cycling",
  "Swimming",
  "Yoga",
  "Strength Training",
  "HIIT",
  "Pilates",
  "Hiking",
  "Dancing",
];

function todayDateString(): string {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  const local = new Date(now.getTime() - offset * 60_000);
  return local.toISOString().slice(0, 10);
}

export function LogForm() {
  const createLog = useCreateLog();

  const [activity, setActivity] = useState("");
  const [duration, setDuration] = useState<string>("");
  const [intensity, setIntensity] = useState<Intensity>("medium");
  const [calories, setCalories] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [date, setDate] = useState(todayDateString());
  const [errors, setErrors] = useState<{
    activity?: string;
    duration?: string;
    submit?: string;
  }>({});

  const reset = () => {
    setActivity("");
    setDuration("");
    setIntensity("medium");
    setCalories("");
    setNotes("");
    setDate(todayDateString());
    setErrors({});
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const next: typeof errors = {};
    if (!activity.trim()) next.activity = "Activity is required";
    const dur = Number(duration);
    if (!Number.isFinite(dur) || dur <= 0)
      next.duration = "Duration must be a positive number";

    if (Object.keys(next).length > 0) {
      setErrors(next);
      return;
    }
    setErrors({});

    const loggedAtIso = new Date(`${date}T12:00:00`).toISOString();

    createLog.mutate(
      {
        activity_type: activity.trim(),
        duration_minutes: Math.round(dur),
        intensity,
        calories: calories ? Math.round(Number(calories)) : null,
        notes: notes.trim() || null,
        logged_at: loggedAtIso,
      },
      {
        onSuccess: reset,
        onError: () => setErrors({ submit: "Could not save log. Try again." }),
      },
    );
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-[12px] border border-rule bg-paper p-5 md:p-6"
    >
      <h2 className="mb-4 text-[14px] font-semibold text-primary md:text-[15px]">
        Log Activity
      </h2>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="md:col-span-2">
          <label className="mb-1 block text-[12px] font-medium text-ink-soft">
            Activity
          </label>
          <Input
            list="activity-suggestions"
            placeholder="e.g. Running"
            className="placeholder:text-[13px] md:placeholder:text-sm"
            value={activity}
            onChange={(e) => {
              setActivity(e.target.value);
              if (errors.activity)
                setErrors({ ...errors, activity: undefined });
            }}
            aria-invalid={!!errors.activity}
          />
          <datalist id="activity-suggestions">
            {ACTIVITY_SUGGESTIONS.map((a) => (
              <option key={a} value={a} />
            ))}
          </datalist>
          {errors.activity && (
            <p className="mt-1 text-[12px] font-medium text-destructive">
              {errors.activity}
            </p>
          )}
        </div>

        <div>
          <label className="mb-1 block text-[12px] font-medium text-ink-soft">
            Duration (minutes)
          </label>
          <Input
            type="number"
            min={1}
            max={1440}
            placeholder="30"
            className="placeholder:text-[13px] md:placeholder:text-sm"
            value={duration}
            onChange={(e) => {
              setDuration(e.target.value);
              if (errors.duration)
                setErrors({ ...errors, duration: undefined });
            }}
            aria-invalid={!!errors.duration}
          />
          {errors.duration && (
            <p className="mt-1 text-[12px] font-medium text-destructive">
              {errors.duration}
            </p>
          )}
        </div>

        <div>
          <label className="mb-1 block text-[12px] font-medium text-ink-soft">
            Date
          </label>
          <Input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="text-[13px] placeholder:text-[13px] md:text-sm md:placeholder:text-sm"
          />
        </div>

        <div className="md:col-span-2">
          <label className="mb-1 block text-[12px] font-medium text-ink-soft">
            Intensity
          </label>
          <div className="flex gap-2">
            {(["low", "medium", "high"] as Intensity[]).map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => setIntensity(opt)}
                className={`flex-1 rounded-md border px-3 py-1.5 text-[13px] capitalize transition-colors ${
                  intensity === opt
                    ? "border-forest-deep bg-forest-deep text-cream"
                    : "border-rule bg-transparent text-primary hover:bg-cream"
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="mb-1 block text-[12px] font-medium text-ink-soft">
            Calories (optional)
          </label>
          <Input
            type="number"
            min={0}
            placeholder="e.g. 250"
            className="placeholder:text-[13px] md:placeholder:text-sm"
            value={calories}
            onChange={(e) => setCalories(e.target.value)}
          />
        </div>

        <div className="md:col-span-2">
          <label className="mb-1 block text-[12px] font-medium text-ink-soft">
            Notes (optional)
          </label>
          <textarea
            placeholder="How did it feel?"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="w-full rounded-md border border-input bg-transparent px-2.5 py-1.5 text-base shadow-xs outline-none placeholder:text-[13px] focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm md:placeholder:text-sm"
          />
        </div>
      </div>

      {errors.submit && (
        <p className="mt-3 text-[12px] font-medium text-destructive">
          {errors.submit}
        </p>
      )}

      <div className="mt-4 flex justify-end">
        <Button type="submit" disabled={createLog.isPending}>
          {createLog.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving…
            </>
          ) : (
            <>
              <Plus className="mr-1 h-4 w-4" /> Add log
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
