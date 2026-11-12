import { Skeleton } from '@/components/ui/skeleton'

export default function BlogListLoading() {
  return (
    <div
      role="status"
      aria-label="Loading articles"
      aria-busy="true"
      className="container mx-auto px-4 pt-24 pb-12"
    >
      <div className="mb-12 flex flex-col items-center gap-4">
        <Skeleton className="h-12 w-72 max-w-full" />
        <Skeleton className="h-6 w-96 max-w-full" />
      </div>

      <div className="mb-12 flex justify-center">
        <Skeleton className="h-12 w-full max-w-2xl rounded-full" />
      </div>

      <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2, 3, 4, 5].map((item) => (
          <article key={item} className="overflow-hidden rounded-2xl border">
            <Skeleton className="aspect-video w-full rounded-none" />
            <div className="space-y-4 p-6">
              <Skeleton className="h-5 w-24 rounded-full" />
              <Skeleton className="h-7 w-4/5" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <div className="flex justify-between border-t pt-4">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-28" />
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  )
}
