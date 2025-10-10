/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { PowerSyncDatabase } from '@powersync/web';
import AppSchema from './schema';
import { Logger, LogContext } from '@/lib/logging/client-logger';

/**
 * PowerSync client singleton
 * Manages local IndexedDB database with offline-first sync
 */
// let powerSyncInstance: PowerSyncDatabase | null = null;
let powerSyncInstance: PowerSyncDatabase | null = null;

/**
 * Initialize PowerSync database
 * Call once during app startup
 */
export async function initPowerSync(): Promise<PowerSyncDatabase> {
  if (powerSyncInstance) return powerSyncInstance;

  try {
    powerSyncInstance = new PowerSyncDatabase({
      database: {
        dbFilename: 'flashlearnai.db',
      },
      schema: AppSchema,
      flags: {
        useWebWorker: false,
        enableMultiTabs: false,
      }
    });

    await powerSyncInstance.init();
    
    console.log('[PowerSync] Database initialized');
    return powerSyncInstance;
  } catch (error) {
    console.error('[PowerSync] Init failed:', error);
    throw error;
  }
}

export function getPowerSync(): PowerSyncDatabase {
  if (!powerSyncInstance) {
    throw new Error('PowerSync not initialized');
  }
  return powerSyncInstance;
}
/**
 * Close PowerSync connection
 * Call during cleanup/logout
 */
export async function closePowerSync(): Promise<void> {
  if (powerSyncInstance) {
    try {
      await powerSyncInstance.disconnectAndClear();
      powerSyncInstance = null;
      Logger.log(LogContext.SYSTEM, 'PowerSync connection closed');
    } catch (error) {
      Logger.error(LogContext.SYSTEM, 'Error closing PowerSync', { error });
    }
  }
}

/**
 * Check if PowerSync is initialized
 */
export function isPowerSyncInitialized(): boolean {
  return powerSyncInstance !== null;
}