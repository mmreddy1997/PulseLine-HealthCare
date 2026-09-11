/** Collapse punctuation and spacing so identical streets are not treated as mismatches. */
export function normalizeAddress(value: string | null | undefined): string {
  if (!value) return "";
  return value
    .trim()
    .toLowerCase()
    .replace(/[.,#]/g, "")
    .replace(/\s+/g, " ");
}

export function addressesDiffer(
  left: string | null | undefined,
  right: string | null | undefined,
): boolean {
  const a = normalizeAddress(left);
  const b = normalizeAddress(right);
  if (!a || !b) return false;
  return a !== b;
}
