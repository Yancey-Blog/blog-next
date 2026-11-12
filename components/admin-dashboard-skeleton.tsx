import { Skeleton } from '@/components/ui/skeleton'

export function AdminDashboardSkeleton() {
  return (
    <div
      role="status"
      aria-label="Loading dashboard"
      aria-busy="true"
      className="flex flex-col gap-6 pb-8"
    >
      <div className="grid grid-cols-1 gap-4 px-4 lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
        {[0, 1, 2, 3].map((item) => (
          <div key={item} className="bg-card space-y-4 rounded-xl border p-5">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-28" />
            <Skeleton className="h-4 w-36" />
          </div>
        ))}
      </div>

      <div className="grid gap-4 px-4 lg:px-6 @3xl/main:grid-cols-3">
        <div className="bg-card space-y-6 rounded-xl border p-5 @3xl/main:col-span-2">
          <div className="space-y-2">
            <Skeleton className="h-5 w-36" />
            <Skeleton className="h-4 w-56" />
          </div>
          <Skeleton className="h-[250px] w-full" />
        </div>
        <div className="bg-card space-y-6 rounded-xl border p-5">
          <div className="space-y-2">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-4 w-44" />
          </div>
          <Skeleton className="mx-auto size-44 rounded-full" />
          <div className="flex justify-center gap-4">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-20" />
          </div>
        </div>
      </div>

      <div className="bg-card space-y-5 rounded-xl border p-5">
        <Skeleton className="h-5 w-36" />
        <div className="grid gap-4 sm:grid-cols-2">
          {[0, 1].map((item) => (
            <div key={item} className="space-y-4 rounded-lg border p-4">
              <Skeleton className="h-4 w-40" />
              {[0, 1, 2, 3].map((row) => (
                <Skeleton key={row} className="h-4 w-full" />
              ))}
            </div>
          ))}
        </div>
      </div>

      <div className="bg-card space-y-5 rounded-xl border p-5">
        <Skeleton className="h-5 w-40" />
        <div className="flex flex-wrap gap-3">
          {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((item) => (
            <Skeleton key={item} className="h-8 w-20 rounded-full" />
          ))}
        </div>
      </div>
    </div>
  )
}
