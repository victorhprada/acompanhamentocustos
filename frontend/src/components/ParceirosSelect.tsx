export const PARCEIRO_OPTIONS = [
  { value: 'totalpass', label: 'Totalpass' },
  { value: 'wellhub', label: 'Wellhub' },
] as const;

export type ParceiroValue = (typeof PARCEIRO_OPTIONS)[number]['value'];

export function ParceirosSelect({
  value,
  onChange,
  label = 'Parceiros',
}: {
  value: string[];
  onChange: (next: string[]) => void;
  label?: string;
}) {
  const toggle = (key: string) => {
    onChange(value.includes(key) ? value.filter(v => v !== key) : [...value, key]);
  };

  return (
    <div>
      <label className="block text-sm text-gray-600 mb-1">{label}</label>
      <div className="flex flex-wrap gap-2 min-h-[34px] items-center">
        {PARCEIRO_OPTIONS.map(opt => {
          const selected = value.includes(opt.value);
          return (
            <button
              type="button"
              key={opt.value}
              onClick={() => toggle(opt.value)}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border transition ${
                selected
                  ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
                  : 'bg-white text-gray-500 border-gray-300 hover:border-gray-400'
              }`}
            >
              {opt.label}
              {selected && <span aria-hidden>×</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function ParceirosBadges({ value }: { value?: string[] | null }) {
  if (!value?.length) {
    return <span className="text-gray-400 text-sm">—</span>;
  }

  return (
    <div className="flex flex-wrap gap-1">
      {value.map(v => {
        const label = PARCEIRO_OPTIONS.find(o => o.value === v)?.label ?? v;
        return (
          <span
            key={v}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700"
          >
            {label}
          </span>
        );
      })}
    </div>
  );
}
