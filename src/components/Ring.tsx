"use client";

type Props = {
  value: number; // 0..1
  size?: number;
  stroke?: number;
  label?: string;
  sub?: string;
  color?: string;
};

export default function Ring({
  value,
  size = 132,
  stroke = 11,
  label,
  sub,
  color = "var(--accent)",
}: Props) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(1, value || 0));
  const offset = c * (1 - clamped);
  return (
    <div className="relative inline-grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} stroke="var(--surface-2)" strokeWidth={stroke} fill="none" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 0.9s cubic-bezier(.4,0,.2,1)" }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">
        <div>
          {label && <div className="font-display text-2xl leading-none text-ink">{label}</div>}
          {sub && <div className="mt-1 text-[11px] text-muted">{sub}</div>}
        </div>
      </div>
    </div>
  );
}
