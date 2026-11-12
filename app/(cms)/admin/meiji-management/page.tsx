'use client'

import { MeijiMediaManager } from '@/components/meiji-media-manager'
import { MeijiProfileForm } from '@/components/meiji-profile-form'
import { MeijiScrapbookManager } from '@/components/meiji-scrapbook-manager'

export default function MeijiManagementPage() {
  return (
    <div className="container mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Meiji 🐱</h1>
        <p className="text-muted-foreground mt-2">
          Manage the cat site at meiji.yanceyleo.com — profile, hero scrapbook,
          and the Daily Meiji media feed.
        </p>
      </div>

      <div className="space-y-8">
        <MeijiProfileForm />
        <MeijiScrapbookManager />
        <MeijiMediaManager />
      </div>
    </div>
  )
}
