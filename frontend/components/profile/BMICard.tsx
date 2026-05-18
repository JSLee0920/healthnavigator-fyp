import type { BMICategory } from "@/lib/healthProfile";

interface BMICardProps {
  bmi: string;
  category: BMICategory;
}

export function BMICard({ bmi, category }: BMICardProps) {
  return (
    <section className="grid gap-5 rounded-[14px] border border-sage bg-sage-soft p-4 md:grid-cols-[1fr_auto] md:items-center md:gap-6 md:p-6">
      <div>
        <div className="mb-1.5 text-[10px] font-medium uppercase tracking-[0.18em] text-forest-deep">
          Body Mass Index
        </div>
        <div className="flex items-baseline gap-2.5">
          <span className="text-[32px] font-semibold leading-none tracking-tight text-ink md:text-[44px]">
            {bmi}
          </span>
          <span className="text-[13px] font-medium text-forest-deep md:text-[14px]">
            {category.label}
          </span>
        </div>
      </div>

      <div className="w-full md:w-[320px]">
        <div className="relative h-2 rounded-full bg-[linear-gradient(90deg,oklch(0.85_0.06_250)_0%,oklch(0.85_0.06_250)_22%,var(--forest)_22%,var(--forest)_50%,oklch(0.82_0.08_80)_50%,oklch(0.82_0.08_80)_75%,oklch(0.75_0.1_40)_75%,oklch(0.75_0.1_40)_100%)]">
          <div
            className="absolute -top-[3px] h-3.5 w-3.5 rounded-full border-2 border-cream bg-ink shadow-[0_0_0_1px_var(--ink)]"
            style={{ left: `calc(${category.position}% - 7px)` }}
          />
        </div>
        <div
          className="mt-2 grid text-[9px] uppercase tracking-[0.12em] text-ink-mute"
          style={{ gridTemplateColumns: "22% 28% 25% 25%" }}
        >
          <span>&lt; 18.5</span>
          <span>18.5–24.9</span>
          <span>25–29.9</span>
          <span className="text-right">30+</span>
        </div>
      </div>
    </section>
  );
}
