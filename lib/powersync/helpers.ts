import { Logger, LogContext } from '@/lib/logging/client-logger';

export function boolToInt(value: boolean): 0 | 1 {
  return value ? 1 : 0;
}

export function intToBool(value: 0 | 1 | number): boolean {
  return value === 1;
}

export function generateMongoId(): string {
  const timestamp = Math.floor(Date.now() / 1000).toString(16).padStart(8, '0');
  const random = Array.from({ length: 16 }, () =>
    Math.floor(Math.random() * 16).toString(16)
  ).join('');
  
  const id = timestamp + random;
  Logger.log(LogContext.SYSTEM, 'Generated MongoDB-compatible ID', { id });
  return id;
}

export function isValidMongoId(id: string): boolean {
  return /^[a-f0-9]{24}$/i.test(id);
}