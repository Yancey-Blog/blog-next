/** A push send failure with this status means the subscription is gone and should be pruned. */
export function isExpiredSubscriptionStatus(statusCode: number): boolean {
  return statusCode === 404 || statusCode === 410
}
