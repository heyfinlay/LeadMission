export const LoadingState = ({ label = "Loading command center..." }: { label?: string }) => (
  <div className="flex min-h-[260px] items-center justify-center rounded-xl border border-slate-700/70 bg-slate-900/40 text-sm text-slate-300">
    {label}
  </div>
);
