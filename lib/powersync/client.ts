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

    const db = new PowerSyncDatabase({
      schema: AppSchema,
      database: {
        dbFilename: 'flashlearnai.db', // IndexedDB database name
      },
      flags: {
        useWebWorker: false, // Fix worker script error
        enableMultiTabs: true, // Allow multiple tabs
      },
    });

    // Wait for ready state

    // await new Promise((resolve) => {
    //   if (powerSyncInstance!.ready) {
    //     resolve(true);
    //   } else {
    //     const checkReady = setInterval(() => {
    //       console.log('Checking ready state:', powerSyncInstance!.ready);
    //       if (powerSyncInstance!.ready) {
    //         clearInterval(checkReady);
    //         resolve(true);
    //       }
    //     }, 100);
    //   }
    // });
    

    Logger.info(LogContext.SYSTEM, 'PowerSync initialized successfully', {
      dbName: 'flashlearnai.db',
      tables: Object.keys(AppSchema.tables),
    });

    await db.init();

    powerSyncInstance = db;

    console.log('[PowerSync] Database initialized successfully');
    console.log('[PowerSync] Database name:', 'flashlearnai.db');
    console.log('[PowerSync] Tables:', Object.keys(AppSchema.tables));

    return db;
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