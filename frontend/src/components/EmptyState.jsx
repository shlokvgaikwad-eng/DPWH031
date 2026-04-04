import { FolderOpen } from '@phosphor-icons/react';

export function EmptyState({ icon, title = 'No data available', subtitle = 'Try adjusting your filters or check back later.' }) {
  const Icon = icon || FolderOpen;
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <div className="w-14 h-14 rounded-2xl bg-[#1E293B] flex items-center justify-center mb-4">
        <Icon size={28} className="text-[#4A5568]" />
      </div>
      <h3 className="text-sm font-medium text-[#B0B8C4] mb-1">{title}</h3>
      <p className="text-xs text-[#4A5568] max-w-xs text-center">{subtitle}</p>
    </div>
  );
}
