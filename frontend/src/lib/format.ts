/** The API stores DNS names with a trailing dot; the console shows zone names without it. */
export const stripTrailingDot = (name: string): string => (name.endsWith(".") ? name.slice(0, -1) : name);
