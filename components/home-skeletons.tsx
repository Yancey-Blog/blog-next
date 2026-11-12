import { Skeleton } from '@/components/ui/skeleton'

export function HomeHeroSkeleton() {
  return (
    <section
      role="status"
      aria-label="Loading homepage introduction"
      aria-busy="true"
      className="relative flex min-h-screen items-center justify-center overflow-hidden bg-neutral-950 px-4 pt-20"
    >
      <div className="flex w-full max-w-4xl flex-col items-center gap-8">
        <Skeleton className="h-7 w-64 rounded-full bg-white/15" />
        <Skeleton className="h-20 w-[min(70vw,36rem)] bg-white/15 md:h-28" />
        <div className="flex w-full max-w-2xl flex-col items-center gap-3">
          <Skeleton className="h-6 w-11/12 bg-white/15" />
          <Skeleton className="h-4 w-2/3 bg-white/10" />
        </div>
        <div className="flex gap-16">
          <Skeleton className="h-16 w-24 bg-white/15" />
          <Skeleton className="h-16 w-24 bg-white/15" />
        </div>
        <div className="flex gap-3">
          <Skeleton className="h-10 w-32 rounded-full bg-white/20" />
          <Skeleton className="h-10 w-28 rounded-full bg-white/10" />
        </div>
      </div>
    </section>
  )
}

export function HomeOpenSourceSkeleton() {
  return (
    <section
      role="status"
      aria-label="Loading featured projects"
      aria-busy="true"
      className="py-16"
    >
      <div className="container mx-auto space-y-8 px-4">
        <Skeleton className="h-8 w-56" />
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((item) => (
            <div key={item} className="space-y-4 rounded-xl border p-6">
              <div className="flex items-center gap-3">
                <Skeleton className="size-10 rounded-lg" />
                <Skeleton className="h-5 w-36" />
              </div>
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-4/5" />
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export function HomeArticlesSkeleton() {
  return (
    <section
      role="status"
      aria-label="Loading latest articles"
      aria-busy="true"
      className="mb-20 md:mb-28"
    >
      <div className="container mx-auto space-y-10 px-4">
        <Skeleton className="h-[min(55vh,34rem)] min-h-[360px] w-full rounded-3xl" />
        <div className="flex items-end justify-between">
          <div className="space-y-3">
            <Skeleton className="h-3 w-28" />
            <Skeleton className="h-9 w-56" />
          </div>
          <Skeleton className="h-4 w-20" />
        </div>
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((item) => (
            <div
              key={item}
              className="space-y-4 overflow-hidden rounded-2xl border pb-6"
            >
              <Skeleton className="aspect-video w-full rounded-none" />
              <div className="space-y-3 px-6">
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
