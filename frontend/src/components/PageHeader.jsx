export function PageHeader({ icon, title, subtitle, meta, actions }) {
  return (
    <div className="mb-8">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          {icon && (
            <div className="w-9 h-9 rounded-lg bg-[#1E293B] flex items-center justify-center shrink-0">
              {icon}
            </div>
          )}
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-semibold text-[#F8FAFC]">
              {title}
            </h1>
            {meta && (
              <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-md bg-[#1E293B] text-[10px] font-mono text-[#B0B8C4] border border-[#2A3441]">
                {meta}
              </span>
            )}
          </div>
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
      {subtitle && <p className="text-sm text-[#B0B8C4] max-w-xl mt-2 ml-12">{subtitle}</p>}
    </div>
  );
}
