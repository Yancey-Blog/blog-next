/** Browser-only invitation. Credentials stay in the URI fragment, never HTTP query strings. */
export function createReviewerLink(now = Date.now()) {
  const bytes = crypto.getRandomValues(new Uint8Array(32))
  const secret = btoa(String.fromCharCode(...bytes))
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replaceAll('=', '')
  const code = `device-registration-ios-${crypto.randomUUID()}.${secret}`
  const expiresAt = now + 10 * 60_000
  return { code, expiresAt, url: `hikki://reviewer-pair#${code}.${expiresAt}` }
}
