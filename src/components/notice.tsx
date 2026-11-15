import { CircleAlert, CircleCheck, Info, TriangleAlert, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type NoticeTone = "neutral" | "info" | "positive" | "warning" | "negative";

const tones: Record<NoticeTone, { icon: LucideIcon; className: string; iconClass: string }> = {
  neutral: { icon: Info, className: "bg-white/[0.03] border-white/10", iconClass: "text-muted-foreground" },
  info: { icon: Info, className: "bg-info/[0.07] border-info/25", iconClass: "text-info" },
  positive: { icon: CircleCheck, className: "bg-positive/[0.07] border-positive/25", iconClass: "text-positive" },
  warning: { icon: TriangleAlert, className: "bg-warning/[0.07] border-warning/25", iconClass: "text-warning" },
  negative: { icon: CircleAlert, className: "bg-negative/[0.08] border-negative/30", iconClass: "text-negative" },
};

type NoticeProps = {
  tone?: NoticeTone;
  title?: React.ReactNode;
  icon?: LucideIcon;
  children?: React.ReactNode;
  className?: string;
};

/** Inline callout for warnings and context. The icon and title carry meaning, not just the colour. */
export function Notice({ tone = "neutral", title, icon, children, className }: NoticeProps) {
  const t = tones[tone];
  const Icon = icon ?? t.icon;

  return (
    <div className={cn("flex gap-3 rounded-xl border p-3 text-sm", t.className, className)}>
      <Icon aria-hidden className={cn("mt-0.5 size-4 shrink-0", t.iconClass)} />
      <div className="min-w-0 space-y-1">
        {title && <p className="font-medium text-foreground">{title}</p>}
        {children && <div className="leading-relaxed text-muted-foreground">{children}</div>}
      </div>
    </div>
  );
}
