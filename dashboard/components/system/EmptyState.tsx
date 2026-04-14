// =============================================================================
// EmptyState — Placeholder for empty lists and missing data.
// =============================================================================

interface EmptyStateProps {
  title:       string;
  description: string;
  action?:     React.ReactNode;
}

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-border bg-card p-12 text-center">
      <div className="mb-2 text-3xl text-muted-foreground">—</div>
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      <p className="mt-1 text-xs text-muted-foreground">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
