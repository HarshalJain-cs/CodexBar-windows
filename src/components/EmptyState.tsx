interface EmptyStateProps {
  onOpenSettings: () => void;
}

export function EmptyState({ onOpenSettings }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="text-4xl mb-4">📊</div>
      <h2 className="text-sm font-medium text-zinc-300 mb-1">
        No providers configured
      </h2>
      <p className="text-xs text-zinc-500 mb-4 max-w-[250px]">
        Enable your AI coding assistants to start tracking usage quotas.
      </p>
      <button
        onClick={onOpenSettings}
        className="text-xs px-3 py-1.5 rounded-md bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors border border-zinc-700"
      >
        Open Settings
      </button>
    </div>
  );
}
