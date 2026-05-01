import { Team } from '@/models/Team';

const MAX_ATTEMPTS = 10;

function randomSixDigit(): string {
  // 100000-999999 inclusive. Avoids leading-zero codes so users do not lose them.
  return String(100_000 + Math.floor(Math.random() * 900_000));
}

export async function generateUniqueJoinCode(): Promise<string> {
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const code = randomSixDigit();
    const collision = await Team.findOne({ joinCode: code }).select('_id').lean();
    if (!collision) return code;
  }
  throw new Error('Failed to generate a unique join code after multiple attempts');
}
