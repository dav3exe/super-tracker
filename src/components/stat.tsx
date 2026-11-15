import { cn } from "@/lib/utils";

export type Tone = "default" | "muted" | "positive" | "negative" | "warning" | "info";

const toneClass: Record<Tone, string> = {
  default: "text-foreground",
  muted: "text-muted-foreground",
  positive: "text-positive",
  negative: "text-negative",
  warning: "text-warning",
  info: "text-info",
};

/** Positive → green, negative → red, null → muted. */
export const pnlTone = (value: number | null | undefined): Tone =>
  value == null ? "muted" : value >= 0 ? "positive" : "negative";

type StatProps = {
  label: React.ReactNode;
  value: React.ReactNode;
  hint?: React.ReactNode;
  tone?: Tone;
  size?: "sm" | "md";
  className?: string;
};

/** A labelled figure. Numbers use tabular figures so columns line up. */
export function Stat({ label, value, hint, tone = "default", size = "sm", className }: StatProps) {
  return (
    <div className={cn("min-w-0", className)}>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd
        className={cn(
          "mt-0.5 truncate font-medium tabular-nums",
          size === "md" ? "text-lg" : "text-sm",
          toneClass[tone]
        )}
      >
        {value}
      </dd>
      {hint && <dd className="mt-0.5 text-xs text-muted-foreground">{hint}</dd>}
    </div>
  );
}

/** Grid wrapper for a group of Stats. */
export function StatGrid({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <dl className={cn("grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3", className)}>{children}</dl>
  );
}
