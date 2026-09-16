'use client'

import { useEffect, useState } from 'react'

export function InstallPrompt() {
  const [isIOS, setIsIOS] = useState(false)
  const [isStandalone, setIsStandalone] = useState(false)

  useEffect(() => {
    setIsIOS(
      /iPad|iPhone|iPod/.test(navigator.userAgent) && !('MSStream' in window)
    )
    setIsStandalone(window.matchMedia('(display-mode: standalone)').matches)
  }, [])

  if (!isIOS || isStandalone) return null

  return (
    <p className="text-muted-foreground mb-3 text-center text-xs">
      Install this app: tap the share icon, then &quot;Add to Home Screen&quot;.
    </p>
  )
}
