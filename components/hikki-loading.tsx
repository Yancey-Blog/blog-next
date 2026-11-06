import { Skeleton } from '@/components/ui/skeleton'

export function HikkiRowsSkeleton({
  label,
  table = false
}: {
  label: string
  table?: boolean
}) {
  return (
    <div role="status" aria-label={label} aria-busy="true">
      <div aria-hidden="true" className="divide-border divide-y">
        {[0, 1, 2].map((row) => (
          <div
            key={row}
            className="flex items-center gap-4 py-4 first:pt-1 last:pb-1"
          >
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton
                className={
                  row === 1 ? 'h-4 w-2/3 rounded-md' : 'h-4 w-4/5 rounded-md'
                }
              />
              <Skeleton className="h-3 w-1/2 rounded-md" />
            </div>
            {table && (
              <>
                <Skeleton className="hidden h-4 w-24 rounded-md sm:block" />
                <Skeleton className="hidden h-4 w-28 rounded-md lg:block" />
                <Skeleton className="h-8 w-20 rounded-lg" />
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

export function HikkiDetailSkeleton({ label }: { label: string }) {
  return (
    <div role="status" aria-label={label} aria-busy="true">
      <div aria-hidden="true" className="space-y-6">
        <div className="space-y-3">
          <Skeleton className="size-10 rounded-lg" />
          <Skeleton className="h-6 w-2/3 rounded-md" />
          <Skeleton className="h-3 w-1/3 rounded-md" />
        </div>
        <div className="space-y-3">
          <Skeleton className="h-4 w-full rounded-md" />
          <Skeleton className="h-4 w-5/6 rounded-md" />
          <Skeleton className="h-4 w-full rounded-md" />
          <Skeleton className="h-4 w-3/4 rounded-md" />
        </div>
      </div>
    </div>
  )
}
