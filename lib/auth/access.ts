/** One live allowlist for OAuth provisioning, sessions, pages, APIs and Hikki review. */
export function getAdminEmails(): string[] {
  return (process.env.ADMIN_EMAILS ?? '')
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean)
}
export function isAdminEmail(email: string | null | undefined): boolean {
  return !!email && getAdminEmails().includes(email.trim().toLowerCase())
}
export function isAdminUser(
  user: { email?: string | null; emailVerified?: boolean } | null | undefined
): boolean {
  return !!user && user.emailVerified === true && isAdminEmail(user.email)
}
