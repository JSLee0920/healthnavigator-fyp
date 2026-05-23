"use client";

import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { startOfWeekLocal, type ExerciseLog } from "@/hooks/useExercise";

interface WeeklyChartProps {
  logs: ExerciseLog[] | undefined;
}

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function WeeklyChart({ logs }: WeeklyChartProps) {
  const data = useMemo(() => {
    const monday = startOfWeekLocal();
    const buckets = DAY_LABELS.map((day, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      return { day, minutes: 0, date: d };
    });

    if (!logs) return buckets;

    for (const log of logs) {
      const t = new Date(log.logged_at);
      const diffDays = Math.floor(
        (t.getTime() - monday.getTime()) / (1000 * 60 * 60 * 24),
      );
      if (diffDays >= 0 && diffDays < 7) {
        buckets[diffDays].minutes += log.duration_minutes;
      }
    }
    return buckets;
  }, [logs]);

  return (
    <div className="flex h-full min-h-80 flex-col rounded-[12px] border border-rule bg-paper p-5 md:p-6">
      <h2 className="mb-4 text-[14px] font-semibold text-primary md:text-[15px]">This Week</h2>
      <div className="min-h-65 w-full flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{ top: 10, right: 10, bottom: 0, left: -20 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="var(--rule)" />
            <XAxis
              dataKey="day"
              tick={{ fontSize: 12, fill: "var(--ink-mute)" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 12, fill: "var(--ink-mute)" }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              cursor={{ fill: "var(--sage-soft)" }}
              contentStyle={{
                background: "var(--paper)",
                border: "1px solid var(--rule)",
                borderRadius: 8,
                fontSize: 12,
                color: "var(--ink)",
              }}
              labelStyle={{ color: "var(--ink)" }}
              itemStyle={{ color: "var(--ink-soft)" }}
              formatter={(value) => [`${value} min`, "Duration"]}
            />
            <Bar
              dataKey="minutes"
              fill="var(--forest-deep)"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
