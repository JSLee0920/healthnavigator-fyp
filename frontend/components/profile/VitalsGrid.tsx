const VITAL_KEYS = [
  { key: "gender", label: "Gender", unit: "" },
  { key: "age", label: "Age", unit: "years" },
  { key: "height", label: "Height", unit: "cm" },
  { key: "weight", label: "Weight", unit: "kg" },
  { key: "blood_type", label: "Blood Type", unit: "" },
] as const;

export type VitalValues = Record<
  (typeof VITAL_KEYS)[number]["key"],
  string | null
>;

export function VitalsGrid({ values }: { values: VitalValues }) {
  return (
    <section>
      <div className="mb-3.5 flex items-baseline gap-3.5">
        <h2 className="text-[16px] font-semibold leading-none tracking-tight text-ink md:text-[18px]">
          Vitals
        </h2>
        <div className="h-px flex-1 bg-rule" />
      </div>

      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-5 md:gap-3">
        {VITAL_KEYS.map((v) => {
          const value = values[v.key];
          const isGender = v.key === "gender";
          return (
            <div
              key={v.key}
              className="flex min-h-[92px] flex-col justify-between rounded-[12px] border border-rule bg-paper p-3.5 md:min-h-[100px] md:p-4"
            >
              <div className="text-[9px] font-medium uppercase tracking-[0.18em] text-ink-mute">
                {v.label}
              </div>
              <div className="flex items-baseline gap-1.5">
                <span
                  className={`text-[24px] font-semibold leading-none tracking-tight text-ink md:text-[30px] ${isGender ? "capitalize" : ""}`}
                >
                  {value ?? "—"}
                </span>
                {value && v.unit && (
                  <span className="text-[10px] uppercase tracking-[0.08em] text-ink-mute md:text-[11px]">
                    {v.unit}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
