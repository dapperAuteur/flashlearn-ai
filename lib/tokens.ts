// lib/tokens.ts
import crypto from 'crypto';

export function generateVerificationToken(): string {
  // Generate a random token
  return crypto.randomBytes(32).toString('hex');
}

export function generateResetToken(): string {
  // Generate a random token for password reset
  return crypto.randomBytes(32).toString('hex');
}