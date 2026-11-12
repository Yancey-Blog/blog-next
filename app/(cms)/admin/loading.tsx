import { Skeleton } from '@/components/ui/skeleton'

export default function AdminLoading() {
  return (
    <div
      role="status"
      aria-label="Loading admin page"
      aria-busy="true"
      className="container mx-auto space-y-6"
    >
      <div className="space-y-2">
        <Skeleton className="h-9 w-56" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((item) => (
          <div key={item} className="bg-card space-y-4 rounded-xl border p-5">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-28" />
            <Skeleton className="h-4 w-36" />
          </div>
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {[0, 1].map((item) => (
          <div key={item} className="bg-card space-y-4 rounded-xl border p-5">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-64 w-full" />
          </div>
        ))}
      </div>
    </div>
  )
}
