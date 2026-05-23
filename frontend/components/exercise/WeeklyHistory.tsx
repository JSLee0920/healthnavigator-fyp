"use client";

import { useMemo } from "react";
import { Loader2 } from "lucide-react";
import {
  Bar,
  BarChart,
  Cell,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { useWeeklyHistory } from "@/hooks/useExercise";

function shortDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

interface WeeklyHistoryProps {
  enabled: boolean;
}

export function WeeklyHistory({ enabled }: WeeklyHistoryProps) {
  const { data, isLoading } = useWeeklyHistory(enabled);

  const chartData = useMemo(() => {
    if (!data) return [];
    return data.weeks.map((w) => ({
      label: shortDate(w.week_start),
      minutes: w.minutes,
      met: w.met,
    }));
  }, [data]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center rounded-[12px] border border-rule bg-paper p-12 text-ink-mute">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  if (!data || data.weeks.length === 0) return null;

  const target = data.weekly_target_minutes;
  const allEmpty = data.weeks.every((w) => w.minutes === 0);

  return (
    <div className="rounded-[12px] border border-rule bg-paper p-5 md:p-6">
      <div className="mb-4 flex items-baseline justify-between">
        <h2 className="text-[14px] font-semibold text-primary md:text-[15px]">
          Past {data.weeks.length} Weeks
        </h2>
        {target > 0 && (
          <span className="text-[12px] text-ink-soft">
            Goal: {target} min/wk
          </span>
        )}
      </div>

      {allEmpty ? (
        <p className="py-8 text-center text-[13px] text-ink-mute">
          No logs in the past {data.weeks.length} weeks.
        </p>
      ) : (
        <div className="h-[240px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 10, right: 10, bottom: 0, left: -20 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="var(--rule)" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: "var(--ink-mute)" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "var(--ink-mute)" }}
                axisLine={false}
                tickLine={false}
              />
              {target > 0 && (
                <ReferenceLine
                  y={target}
                  stroke="var(--ink-mute)"
                  strokeDasharray="4 4"
                  label={{
                    value: "goal",
                    position: "insideTopRight",
                    fontSize: 10,
                    fill: "var(--ink-mute)",
                  }}
                />
              )}
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
                formatter={(value, _name, item) => [
                  `${value} min${item?.payload?.met ? " · met" : ""}`,
                  "Total",
                ]}
                labelFormatter={(label) => `Week of ${label}`}
              />
              <Bar dataKey="minutes" radius={[4, 4, 0, 0]}>
                {chartData.map((d, i) => (
                  <Cell
                    key={i}
                    fill={d.met ? "var(--forest-deep)" : "var(--sage)"}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
