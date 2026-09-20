/** Spojí triedy, vynechá falsy. (Bez tailwind-merge – konflikty riešime poradím.) */
export function cn(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(' ');
}
