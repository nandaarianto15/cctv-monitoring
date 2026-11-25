import type { ReactNode } from 'react';

export function StatCard({
  label,
  value,
  sub,
  icon,
  badge,
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  icon?: ReactNode;
  badge?: ReactNode;
}) {
  return (
    <div className="flex flex-col justify-between rounded-xl border border-saas-border bg-white p-5 shadow-subtle transition-all hover:border-gray-300">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-saas-secondary">
          {label}
        </span>
        {icon && (
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-saas-bg text-saas-secondary">
            {icon}
          </div>
        )}
      </div>
      <div className="mt-3">
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold tracking-tight text-saas-primary">{value}</span>
          {badge}
        </div>
        {sub && <p className="mt-1 text-xs text-saas-secondary font-medium">{sub}</p>}
      </div>
    </div>
  );
}
