import { HikkiManager } from '@/components/hikki-manager'
export default async function HikkiManagementPage({
  searchParams
}: {
  searchParams: Promise<{ review?: string | string[] }>
}) {
  const { review } = await searchParams
  const initialReview =
    typeof review === 'string' && /^review-[a-zA-Z0-9-]{1,100}$/.test(review)
      ? review
      : null
  return (
    <div className="container mx-auto space-y-6">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Hikki Community</h1>
        <p className="text-muted-foreground mt-2">
          Review submissions, publish approved pages, and manage review
          notifications.
        </p>
      </header>
      <HikkiManager initialReview={initialReview} />
    </div>
  )
}
