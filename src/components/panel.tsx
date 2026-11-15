import { cn } from "@/lib/utils";

type PanelProps = React.ComponentProps<"section"> & {
  title?: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
};

/** Frosted glass section with an optional header row. */
export function Panel({ title, description, actions, className, children, ...props }: PanelProps) {
  return (
    <section className={cn("glass rounded-2xl p-4 sm:p-5", className)} {...props}>
      {(title || actions) && (
        <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            {title && <h2 className="text-base font-semibold tracking-tight">{title}</h2>}
            {description && (
              <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
            )}
          </div>
          {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </header>
      )}
      {children}
    </section>
  );
}
