 /* eslint-disable @typescript-eslint/no-explicit-any */
import { PowerSyncDatabase } from '@powersync/web';
import AppSchema from './schema';
import { Logger, LogContext } from '@/lib/logging/client-logger';

/**
 * Where the incremental-pull watermark lives.
 *
 * Versioned on purpose. The local tables became localOnly, which changes how
 * PowerSync stores them, so existing rows do not carry across. Bumping the key
 * makes the next pull a full one instead of leaving an empty store behind a
 * stale watermark that tells the server nothing has changed.
 *
 * It lives here rather than in syncService because closePowerSync has to clear
 * it, and syncService already imports from this module.
 */
export const SYNC_CHECKPOINT_KEY = 'powersync_last_synced_at_v2';

/**
 * PowerSync client singleton
 * Manages local IndexedDB database with offline-first sync
 */
let powerSyncInstance: PowerSyncDatabase | null = null;

/**
 * This module opens a LOCAL SQLite store and nothing more.
 *
 * There used to be a PowerSyncBackendConnector here with a full uploadData
 * implementation. It was never instantiated, and it could not have worked: it
 * pointed at /api/powersync, a plain Next route, while the SDK expects a
 * PowerSync Service serving /sync/stream and /write-checkpoint2.json. No such
 * service has ever been configured for this project.
 *
 * BAM chose to keep PowerSync as a local cache and say so, rather than pay the
 * entry price for real replication. So there is no connect(), no streaming, and
 * no upload queue. Every table is localOnly, which is what stops writes piling
 * up in an internal CRUD queue that nothing drains. Data comes down through
 * lib/services/syncService.ts over plain fetch, and study results go up through
 * /api/study/sessions/sync. See plans/03-offline-sync.md.
 */

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
      // Clear the pull watermark with the data it describes. Wiping the store
      // and leaving the watermark behind means the next pull asks only for
      // changes since a sync whose results are gone, so it returns nothing and
      // the store stays empty. This function has no callers yet and is
      // documented for logout, which is exactly when that would bite.
      if (typeof localStorage !== 'undefined') localStorage.removeItem(SYNC_CHECKPOINT_KEY);
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