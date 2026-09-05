/**
 * Deterministically derives a soft two-tone gradient from a string (e.g. an email),
 * so every account gets a stable, distinct avatar without storing any image.
 */
export function avatarGradient(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  }
  const hue = Math.abs(hash) % 360;
  const hue2 = (hue + 45) % 360;
  return `linear-gradient(135deg, hsl(${hue} 70% 55%), hsl(${hue2} 75% 45%))`;
}
