/**
 * Analytics utilities for tracking custom events
 *
 * This module provides helper functions for sending custom events
 * to Google Analytics (GA4) or Google Tag Manager (GTM)
 */

import { sendGAEvent, sendGTMEvent } from '@next/third-parties/google'

/**
 * Send a custom event to analytics
 * Automatically uses the configured analytics service (GTM or GA4)
 */
export function trackEvent(
  eventName: string,
  parameters?: Record<string, any>
) {
  const GTM_ID = process.env.NEXT_PUBLIC_GTM_ID
  const GA4_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID

  // Prefer GTM if configured
  if (GTM_ID) {
    sendGTMEvent({ event: eventName, ...parameters })
  } else if (GA4_MEASUREMENT_ID) {
    sendGAEvent({ event: eventName, ...parameters })
  }
}

/**
 * Common event tracking functions
 * These provide a consistent interface for tracking common user interactions
 */

export const analytics = {
  // Track page views (usually automatic, but useful for SPAs)
  trackPageView: (path: string) => {
    trackEvent('page_view', { page_path: path })
  },

  // Track blog post views
  trackBlogView: (blogId: string, title: string) => {
    trackEvent('blog_view', {
      blog_id: blogId,
      blog_title: title
    })
  },

  // Track search queries
  trackSearch: (query: string, resultsCount: number) => {
    trackEvent('search', {
      search_term: query,
      results_count: resultsCount
    })
  },

  // Track button clicks
  trackButtonClick: (buttonName: string, location?: string) => {
    trackEvent('button_click', {
      button_name: buttonName,
      location: location
    })
  },

  // Track link clicks (external links, downloads, etc.)
  trackLinkClick: (url: string, type: 'external' | 'download' | 'internal') => {
    trackEvent('link_click', {
      link_url: url,
      link_type: type
    })
  },

  // Track form submissions
  trackFormSubmit: (formName: string, success: boolean) => {
    trackEvent('form_submit', {
      form_name: formName,
      success: success
    })
  },

  // Track theme changes
  trackThemeChange: (theme: string) => {
    trackEvent('theme_change', {
      theme_name: theme
    })
  },

  // Track social shares
  trackShare: (platform: string, contentId: string) => {
    trackEvent('share', {
      platform: platform,
      content_id: contentId
    })
  }
}
