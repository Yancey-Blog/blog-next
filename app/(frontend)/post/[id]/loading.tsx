import { Skeleton } from '@/components/ui/skeleton'

export default function BlogDetailLoading() {
  return (
    <div className="container mx-auto px-4 pt-24 pb-8">
      <div className="relative grid grid-cols-1 gap-8 xl:grid-cols-[minmax(0,1fr)_16rem] xl:items-start">
        <article className="mx-auto w-full max-w-4xl min-w-0">
          {/* Cover image */}
          <Skeleton className="mb-8 aspect-video w-full rounded-lg" />

          {/* Title */}
          <div className="mb-6 space-y-3">
            <Skeleton className="h-12 w-full max-w-3xl" />
            <Skeleton className="h-12 w-2/3" />
          </div>

          {/* Metadata */}
          <div className="border-border mb-8 border-y py-4">
            <div className="text-muted-foreground flex flex-wrap items-center gap-4 text-sm">
              <div className="flex items-center gap-1.5">
                <Skeleton className="h-4 w-4" />
                <Skeleton className="h-4 w-24" />
              </div>

              <div className="flex items-center gap-1.5">
                <Skeleton className="h-4 w-4" />
                <Skeleton className="h-4 w-32" />
              </div>

              <div className="flex items-center gap-1.5">
                <Skeleton className="h-4 w-4" />
                <Skeleton className="h-4 w-16" />
              </div>

              <div className="flex items-center gap-2">
                <Skeleton className="h-5 w-16 rounded-full" />
                <Skeleton className="h-5 w-20 rounded-full" />
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>

              <div className="ml-auto flex items-center gap-2">
                <Skeleton className="h-9 w-16 rounded-full" />
                <Skeleton className="h-9 w-20 rounded-full" />
              </div>
            </div>
          </div>

          {/* Summary */}
          <div className="border-primary/50 bg-muted/30 mb-6 rounded-r-lg border-l-4 p-4">
            <div className="space-y-3">
              <Skeleton className="h-5 w-full" />
              <Skeleton className="h-5 w-full" />
              <Skeleton className="h-5 w-4/5" />
            </div>
          </div>

          {/* Article content */}
          <div className="space-y-8">
            <div className="space-y-3">
              <Skeleton className="h-5 w-full" />
              <Skeleton className="h-5 w-full" />
              <Skeleton className="h-5 w-11/12" />
              <Skeleton className="h-5 w-4/5" />
            </div>

            <Skeleton className="h-8 w-2/3" />

            <div className="space-y-3">
              <Skeleton className="h-5 w-full" />
              <Skeleton className="h-5 w-11/12" />
              <Skeleton className="h-5 w-full" />
              <Skeleton className="h-5 w-3/4" />
            </div>

            <Skeleton className="aspect-video w-full rounded-lg" />

            <div className="space-y-3">
              <Skeleton className="h-5 w-full" />
              <Skeleton className="h-5 w-5/6" />
              <Skeleton className="h-5 w-2/3" />
            </div>
          </div>
        </article>

        {/* Table of contents */}
        <aside className="hidden xl:block">
          <div className="sticky top-24 space-y-5">
            <Skeleton className="h-4 w-32" />

            <div className="border-border space-y-4 border-l pl-4">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-4/5" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-4 w-4/5" />
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}
