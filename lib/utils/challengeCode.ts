/**
 * Generates a versus challenge code like "VS-A3K9M2".
 * Uses characters that avoid ambiguity (no O/0, I/1/L).
 */
export function generateChallengeCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = 'VS-';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}
