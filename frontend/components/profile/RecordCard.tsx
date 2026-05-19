export type RecordTone = "warn" | "alert" | "calm";

const toneClasses: Record<
  RecordTone,
  { bg: string; border: string; text: string; metaWord: string }
> = {
  warn: {
    bg: "bg-[oklch(0.95_0.04_75)]",
    border: "border-[oklch(0.82_0.08_70)]",
    text: "text-[oklch(0.42_0.1_60)]",
    metaWord: "active",
  },
  alert: {
    bg: "bg-[oklch(0.94_0.05_30)]",
    border: "border-[oklch(0.82_0.1_25)]",
    text: "text-[oklch(0.45_0.13_28)]",
    metaWord: "known",
  },
  calm: {
    bg: "bg-paper",
    border: "border-rule",
    text: "text-ink-soft",
    metaWord: "current",
  },
};

interface RecordCardProps {
  title: string;
  tone: RecordTone;
  items: string[];
  emptyText: string;
}

export function RecordCard({ title, tone, items, emptyText }: RecordCardProps) {
  const s = toneClasses[tone];
  const meta = items.length === 0 ? "None" : `${items.length} ${s.metaWord}`;

  return (
    <div className="flex flex-col gap-3.5 rounded-[14px] border border-rule bg-paper p-5 md:p-6">
      <div className="flex items-baseline justify-between">
        <h3 className="text-[15px] font-semibold leading-tight tracking-tight text-ink md:text-[16px]">
          {title}
        </h3>
        <span className="text-[9px] font-medium uppercase tracking-[0.18em] text-ink-mute">
          {meta}
        </span>
      </div>

      <div className="flex flex-col gap-2">
        {items.length === 0 ? (
          <p className="text-[13px] text-ink-mute">{emptyText}</p>
        ) : (
          items.map((item, i) => (
            <div
              key={i}
              className={`flex items-center justify-between gap-3 rounded-[10px] border px-3 py-2.5 ${s.bg} ${s.border}`}
            >
              <div className="min-w-0">
                <div className={`truncate text-[13px] font-medium ${s.text}`}>
                  {item}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
