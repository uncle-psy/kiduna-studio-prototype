import Link from "next/link";
import type { ReactNode, HTMLAttributes, ButtonHTMLAttributes } from "react";

/* ────────────────────────────────────────────────────────────────
   Helpers
   ──────────────────────────────────────────────────────────────── */

function cn(...parts: Array<string | false | undefined | null>): string {
  return parts.filter(Boolean).join(" ");
}

/* ────────────────────────────────────────────────────────────────
   Page header
   ──────────────────────────────────────────────────────────────── */

export function PageHeader({
  crumbs,
  title,
  description,
  action,
  badge,
  className,
}: {
  crumbs: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  badge?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("pageheader", className)}>
      <div>
        <div className="crumbs">{crumbs}</div>
        <div className="flex items-center gap-[12px] flex-wrap">
          <div className="pagetitle">{title}</div>
          {badge}
        </div>
        {description && <div className="pagedesc">{description}</div>}
      </div>
      {action}
    </div>
  );
}

export function Crumb({ href, children }: { href: string; children: ReactNode }) {
  return <Link href={href}>{children}</Link>;
}

/* ────────────────────────────────────────────────────────────────
   Card — flexible: can take title/sub OR be used as a raw container.
   `as` lets it render as <Link>, <a>, etc.
   ──────────────────────────────────────────────────────────────── */

export type CardProps = {
  title?: ReactNode;
  sub?: ReactNode;
  children?: ReactNode;
  className?: string;
  href?: string;
  onClick?: () => void;
} & Omit<HTMLAttributes<HTMLDivElement>, "title" | "onClick">;

export function Card({
  title,
  sub,
  children,
  className,
  href,
  onClick,
  ...rest
}: CardProps) {
  const cls = cn("card", className);
  const content = (
    <>
      {title !== undefined && <div className="card-title">{title}</div>}
      {sub !== undefined && <div className="card-sub">{sub}</div>}
      {children}
    </>
  );

  if (href) {
    return (
      <Link href={href} className={cls} onClick={onClick}>
        {content}
      </Link>
    );
  }

  return (
    <div className={cls} onClick={onClick} {...rest}>
      {content}
    </div>
  );
}

export function CardTitle({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={cn("card-title", className)}>{children}</div>;
}

export function CardSub({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={cn("card-sub", className)}>{children}</div>;
}

/* ────────────────────────────────────────────────────────────────
   Stat
   ──────────────────────────────────────────────────────────────── */

export function Stat({
  label,
  value,
  delta,
  deltaNeg,
  className,
}: {
  label: ReactNode;
  value: ReactNode;
  delta?: ReactNode;
  deltaNeg?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("stat", className)}>
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
      {delta !== undefined && (
        <div className={cn("stat-delta", deltaNeg && "neg")}>{delta}</div>
      )}
    </div>
  );
}

/** A Card that contains exactly one Stat. */
export function StatCard(props: {
  label: ReactNode;
  value: ReactNode;
  delta?: ReactNode;
  deltaNeg?: boolean;
  className?: string;
}) {
  return (
    <Card className={props.className}>
      <Stat {...props} className={undefined} />
    </Card>
  );
}

/* ────────────────────────────────────────────────────────────────
   Badge
   ──────────────────────────────────────────────────────────────── */

export type BadgeVariant = "pass" | "fail" | "live" | "locked";

export function Badge({
  variant,
  dot,
  children,
  className,
}: {
  variant?: BadgeVariant;
  dot?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span className={cn("badge", variant, dot && "dot", className)}>
      {children}
    </span>
  );
}

/* ────────────────────────────────────────────────────────────────
   Action-type badge (the colored proposal-type pills)
   ──────────────────────────────────────────────────────────────── */

export type ActionType =
  | "spend"
  | "exec"
  | "mixed"
  | "mint"
  | "perf"
  | "param"
  | "with"
  | "liquidity"
  | "metadata";

export function ActionTypeBadge({
  type,
  children,
  className,
}: {
  type: ActionType;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span className={cn("at-badge", type, className)}>
      <span className="d" />
      {children}
    </span>
  );
}

/* ────────────────────────────────────────────────────────────────
   Explainer / Annote
   ──────────────────────────────────────────────────────────────── */

export function Explainer({
  title,
  children,
  className,
}: {
  title?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("explainer", className)}>
      {title && <h4>{title}</h4>}
      {children}
    </div>
  );
}

export function Annote({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={cn("annote", className)}>{children}</div>;
}

/* ────────────────────────────────────────────────────────────────
   Avatar
   ──────────────────────────────────────────────────────────────── */

export function Avatar({
  variant,
  className,
}: {
  variant: 1 | 2 | 3 | 4;
  className?: string;
}) {
  return <span className={cn("av", `a${variant}`, className)} />;
}

/* ────────────────────────────────────────────────────────────────
   Section caption
   ──────────────────────────────────────────────────────────────── */

export function SectionCap({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={cn("section-cap", className)}>{children}</div>;
}

/* ────────────────────────────────────────────────────────────────
   Step rail
   ──────────────────────────────────────────────────────────────── */

export type StepState = "active" | "done" | "todo";

export function StepRail({
  steps,
  className,
}: {
  steps: { num: ReactNode; label: ReactNode; href?: string; state: StepState }[];
  className?: string;
}) {
  return (
    <div className={cn("step-rail", className)}>
      {steps.map((s, i) => {
        const cls = cn("step", s.state === "active" && "active", s.state === "done" && "done");
        const inner = (
          <>
            <span className="num">{s.num}</span>
            {s.label}
          </>
        );
        return s.href ? (
          <Link key={i} href={s.href} className={cls}>
            {inner}
          </Link>
        ) : (
          <div key={i} className={cls}>
            {inner}
          </div>
        );
      })}
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────
   Field (form input wrapper)
   ──────────────────────────────────────────────────────────────── */

export function Field({
  label,
  hint,
  children,
  className,
}: {
  label?: ReactNode;
  hint?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("field", className)}>
      {label && <label>{label}</label>}
      {children}
      {hint && <div className="hint">{hint}</div>}
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────
   Buttons
   ──────────────────────────────────────────────────────────────── */

export type ButtonVariant = "primary" | "ghost" | "danger";
export type ButtonSize = "sm";

function buttonClasses(opts: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  block?: boolean;
  className?: string;
}) {
  return cn(
    "btn",
    opts.variant === "primary" && "btn-primary",
    opts.variant === "ghost" && "btn-ghost",
    opts.variant === "danger" && "btn-danger",
    opts.size === "sm" && "btn-sm",
    opts.block && "btn-block",
    opts.className
  );
}

export function Button({
  variant,
  size,
  block,
  children,
  className,
  ...rest
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  block?: boolean;
  children: ReactNode;
} & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button className={buttonClasses({ variant, size, block, className })} {...rest}>
      {children}
    </button>
  );
}

export function LinkButton({
  href,
  variant,
  size,
  block,
  children,
  className,
  onClick,
}: {
  href: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  block?: boolean;
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}) {
  return (
    <Link
      href={href}
      className={buttonClasses({ variant, size, block, className })}
      onClick={onClick}
    >
      {children}
    </Link>
  );
}

export { ImagePicker } from "./ImagePicker";
export type { ImagePickerProps } from "./ImagePicker";