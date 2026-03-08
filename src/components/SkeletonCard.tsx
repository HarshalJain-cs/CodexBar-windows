interface SkeletonCardProps {
  compact?: boolean;
}

export default function SkeletonCard({ compact = false }: SkeletonCardProps) {
  if (compact) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 animate-pulse">
        <div className="h-4 w-4 rounded bg-muted" />
        <div className="h-3 w-16 rounded bg-muted flex-1" />
        <div className="h-3 w-8 rounded bg-muted" />
        <div className="h-3 w-8 rounded bg-muted" />
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-card p-3 animate-pulse">
      <div className="flex items-center gap-2 mb-3">
        <div className="h-5 w-5 rounded bg-muted" />
        <div className="h-3.5 w-20 rounded bg-muted" />
        <div className="h-2 w-2 rounded-full bg-muted ml-auto" />
      </div>
      <div className="space-y-2">
        <div>
          <div className="flex justify-between mb-1">
            <div className="h-2 w-10 rounded bg-muted" />
            <div className="h-2.5 w-6 rounded bg-muted" />
          </div>
          <div className="h-1.5 w-full rounded-full bg-muted" />
        </div>
        <div>
          <div className="flex justify-between mb-1">
            <div className="h-2 w-10 rounded bg-muted" />
            <div className="h-2.5 w-6 rounded bg-muted" />
          </div>
          <div className="h-1.5 w-full rounded-full bg-muted" />
        </div>
      </div>
      <div className="mt-2 h-2.5 w-12 rounded bg-muted" />
    </div>
  );
}
