// =============================================================================
// Dashboard loading skeleton
// =============================================================================

export default function DashboardLoading() {
  return (
    <div className="space-y-4 p-6">
      {[...Array(3)].map((_, i) => (
        <div
          key={i}
          className="h-24 animate-pulse rounded-lg bg-card"
          style={{ opacity: 1 - i * 0.25 }}
        />
      ))}
    </div>
  );
}
