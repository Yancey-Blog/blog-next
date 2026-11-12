'use client'

import { AIModelSettings } from '@/components/ai-model-settings'
import AuthManagement from '@/components/auth-management'
import { SettingsNav } from '@/components/settings-nav'

const SECTIONS = [
  { id: 'auth-management', title: 'Auth Management' },
  { id: 'ai-model', title: 'AI Model' }
]

export default function SettingsPage() {
  return (
    <div className="container mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-2">
          Customize your application settings
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-[11rem_minmax(0,1fr)]">
        <aside className="hidden lg:block">
          <SettingsNav sections={SECTIONS} />
        </aside>
        <div className="space-y-8">
          <section id="auth-management" className="scroll-mt-6">
            <AuthManagement />
          </section>
          <section id="ai-model" className="scroll-mt-6">
            <AIModelSettings />
          </section>
        </div>
      </div>
    </div>
  )
}
