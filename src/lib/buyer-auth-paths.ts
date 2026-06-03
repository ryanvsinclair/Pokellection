/** Paths that require a signed-in buyer account before use. */

const BUYER_AUTH_PREFIXES = ["/checkout", "/reserve"] as const;

export function isBuyerAuthRequiredPath(pathname: string): boolean {
  return BUYER_AUTH_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export function buyerSignupPath(returnPath: string): string {
  const params = new URLSearchParams({ redirect: returnPath });
  return `/account/signup?${params.toString()}`;
}

export function buyerLoginPath(returnPath: string): string {
  const params = new URLSearchParams({ redirect: returnPath });
  return `/account/login?${params.toString()}`;
}
