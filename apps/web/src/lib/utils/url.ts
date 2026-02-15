/**
 * Extracts the subdomain from the current hostname.
 * e.g. acme.karibu.ai → "acme", localhost → null, karibu.ai → null
 */
export function getSubdomain(): string | null {
  if (typeof window === "undefined") return null;
  const parts = window.location.hostname.split(".");
  return parts.length >= 3 ? parts[0] : null;
}
