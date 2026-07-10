/** Idle session timeout: 3 hours without user activity → force re-login */
export const IDLE_TIMEOUT_MS = 3 * 60 * 60 * 1000;

/** Refresh access token this many seconds before JWT exp */
export const TOKEN_REFRESH_SKEW_SECONDS = 90;

export function isTokenExpiringSoon(token: string, skewSeconds = TOKEN_REFRESH_SKEW_SECONDS): boolean {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]!));
    if (!payload?.exp) return true;
    return payload.exp * 1000 <= Date.now() + skewSeconds * 1000;
  } catch {
    return true;
  }
}
