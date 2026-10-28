import { Skeleton } from "@/components/ui/misc";

export default function PanelLoading() {
  return (
    <div className="space-y-6" aria-busy aria-label="Carregando">
      <Skeleton className="h-9 w-56" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
      <Skeleton className="h-64" />
    </div>
  );
}
