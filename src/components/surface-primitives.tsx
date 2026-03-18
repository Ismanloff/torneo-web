import type { ReactNode } from "react";

type SectionHeaderProps = {
  eyebrow: string;
  title: string;
  description?: string;
  action?: ReactNode;
  align?: "start" | "end";
};

type MetricStripItem = {
  label: string;
  value: ReactNode;
  meta?: string;
  tone?: "accent" | "info" | "neutral";
};

type MetricStripProps = {
  items: MetricStripItem[];
  className?: string;
};

type EmptyStatePanelProps = {
  eyebrow?: string;
  title: string;
  description: string;
  action?: ReactNode;
  compact?: boolean;
};

type StatusPillProps = {
  children: ReactNode;
  tone?: "accent" | "info" | "muted" | "warning" | "success";
};

export function SectionHeader({
  eyebrow,
  title,
  description,
  action,
  align = "end",
}: SectionHeaderProps) {
  return (
    <div className={`section-header section-header--${align}`}>
      <div className="section-header__copy">
        <p className="section-header__eyebrow">{eyebrow}</p>
        <h2 className="section-header__title">{title}</h2>
        {description ? <p className="section-header__description">{description}</p> : null}
      </div>
      {action ? <div className="section-header__action">{action}</div> : null}
    </div>
  );
}

export function MetricStrip({ items, className = "" }: MetricStripProps) {
  return (
    <div className={`metric-strip ${className}`.trim()}>
      {items.map((item) => (
        <div
          key={`${item.label}-${String(item.value)}`}
          className={`metric-strip__item metric-strip__item--${item.tone ?? "neutral"}`}
        >
          <p className="metric-strip__label">{item.label}</p>
          <p className="metric-strip__value">{item.value}</p>
          {item.meta ? <p className="metric-strip__meta">{item.meta}</p> : null}
        </div>
      ))}
    </div>
  );
}

export function EmptyStatePanel({
  eyebrow,
  title,
  description,
  action,
  compact = false,
}: EmptyStatePanelProps) {
  return (
    <div className={`empty-panel ${compact ? "empty-panel--compact" : ""}`.trim()}>
      {eyebrow ? <p className="empty-panel__eyebrow">{eyebrow}</p> : null}
      <p className="empty-panel__title">{title}</p>
      <p className="empty-panel__description">{description}</p>
      {action ? <div className="empty-panel__action">{action}</div> : null}
    </div>
  );
}

export function StatusPill({ children, tone = "muted" }: StatusPillProps) {
  return <span className={`status-pill status-pill--${tone}`}>{children}</span>;
}
