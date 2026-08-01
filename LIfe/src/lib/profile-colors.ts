export const LAYSLLA_PROFILE_COLOR = "#ec4899";

export function isLaysllaProfile(value: string | null | undefined): boolean {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .includes("layslla");
}

export function defaultProfileColor(displayName?: string | null, email?: string | null): string {
  return isLaysllaProfile(displayName) || isLaysllaProfile(email)
    ? LAYSLLA_PROFILE_COLOR
    : "#6366f1";
}

export function effectiveProfileColor<T extends { display_name?: string | null; color?: string | null }>(profile: T): T {
  if (!isLaysllaProfile(profile.display_name)) return profile;
  return { ...profile, color: LAYSLLA_PROFILE_COLOR };
}
