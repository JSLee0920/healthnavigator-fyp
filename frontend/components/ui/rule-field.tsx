interface RuleFieldProps {
  id: string;
  label: string;
  type?: string;
  placeholder?: string;
  value: string;
  onChange: (v: string) => void;
  onBlur?: () => void;
  invalid?: boolean;
  error?: string;
}

export function RuleField({
  id,
  label,
  type = "text",
  placeholder,
  value,
  onChange,
  onBlur,
  invalid,
  error,
}: RuleFieldProps) {
  return (
    <label htmlFor={id} className="block">
      <div className="mb-2 text-[13px] font-medium text-ink-soft">{label}</div>
      <div
        data-invalid={invalid ? "" : undefined}
        className="group relative border-b border-rule pb-0.5 transition-colors focus-within:border-forest-deep data-invalid:border-destructive"
      >
        <input
          id={id}
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          aria-invalid={invalid}
          className="w-full border-0 bg-transparent py-2 text-[17px] font-normal text-ink outline-none placeholder:text-[14px] placeholder:text-ink-mute/70"
        />
      </div>
      {invalid && error && (
        <p
          role="alert"
          className="mt-1.5 text-[12px] font-normal text-destructive"
        >
          {error}
        </p>
      )}
    </label>
  );
}
