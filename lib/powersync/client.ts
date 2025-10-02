import { PowerSyncDatabase } from '@powersync/web';
import AppSchema from './schema';
import { Logger, LogContext } from '@/lib/logging/client-logger';

/**
 * PowerSync client singleton
 * Manages local IndexedDB database with offline-first sync
 */
let powerSyncInstance: PowerSyncDatabase | null = null;

/**
 * Initialize PowerSync database
 * Call once during app startup
 */
export async function initPowerSync(): Promise<PowerSyncDatabase> {
  if (powerSyncInstance) {
    Logger.log(LogContext.SYSTEM, 'PowerSync already initialized');
    return powerSyncInstance;
  }

  try {
    Logger.log(LogContext.SYSTEM, 'Initializing PowerSync database');

    powerSyncInstance = new PowerSyncDatabase({
      schema: AppSchema,
      database: {
        dbFilename: 'flashlearnai.db', // IndexedDB database name
      },
    });

    await powerSyncInstance.init();

    Logger.log(LogContext.SYSTEM, 'PowerSync initialized successfully', {
      dbName: 'flashlearnai.db',
      tables: Object.keys(AppSchema.tables),
    });

    return powerSyncInstance;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    Logger.error(LogContext.SYSTEM, 'Failed to initialize PowerSync', {
      error: errorMessage,
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw new Error(`PowerSync initialization failed: ${errorMessage}`);
  }
}

/**
 * Get PowerSync instance
 * @throws Error if not initialized
 */
export function getPowerSync(): PowerSyncDatabase {
  if (!powerSyncInstance) {
    const error = 'PowerSync not initialized. Call initPowerSync() first.';
    Logger.error(LogContext.SYSTEM, error);
    throw new Error(error);
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