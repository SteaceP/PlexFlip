/**
 * Calculates the number of minutes from a given duration in milliseconds.
 *
 * @param duration The duration in milliseconds.
 * @returns The number of minutes.
 */
export function getMinutes(duration: number): number {
  return Math.floor(duration / 60000);
}
