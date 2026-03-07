interface EmptyStateProps {
  onOpenSettings: () => void;
}

export function EmptyState({ onOpenSettings }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-14 px-4 text-center animate-fade-in">
      <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4" style={{ background: 'var(--accent-subtle)' }}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" style={{ color: 'var(--accent)' }}>
          <path d="M3 3v18h18" />
          <path d="M7 16l4-8 4 4 4-6" />
        </svg>
      </div>
      <h2 className="text-sm font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
        No providers configured
      </h2>
      <p className="text-xs mb-5 max-w-[240px]" style={{ color: 'var(--text-tertiary)' }}>
        Enable your AI coding assistants to start tracking usage quotas.
      </p>
      <button onClick={onOpenSettings} className="cb-btn cb-btn-primary">
        Configure Providers
      </button>
    </div>
  );
}
