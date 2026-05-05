import type { ReactNode } from "react";

interface StatCardProps {
  title: string;
  value: string | number;
  hint?: string;
  icon?: ReactNode;
}

export default function StatCard({ title, value, hint, icon }: StatCardProps) {
  return (
    <div className="panel p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-slate-500">{title}</div>
          <div className="mt-2 text-3xl font-black text-slate-900">{value}</div>
        </div>
        {icon ? (
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-equipment-50 text-equipment-700">
            {icon}
          </div>
        ) : null}
      </div>
      {hint ? <div className="mt-3 text-xs font-medium text-slate-500">{hint}</div> : null}
    </div>
  );
}
