import { GoogleAnalytics as GA4 } from '@next/third-parties/google'

export function GoogleAnalytics() {
  const GA_KEY = process.env.NEXT_PUBLIC_GA_KEY

  if (GA_KEY) {
    return <GA4 gaId={GA_KEY} />
  }

  // No analytics configured
  return null
}
