import type { ReactNode } from "react";

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="text-center py-[28px] px-[16px]">
      <div className="text-[13px] font-medium text-fg mb-[4px]">{title}</div>
      {description && (
        <div className="text-[12px] text-muted mb-[14px]">{description}</div>
      )}
      {action}
    </div>
  );
}