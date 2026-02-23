 /* eslint-disable @typescript-eslint/no-explicit-any */
import { AbstractPowerSyncDatabase, PowerSyncDatabase, UpdateType, PowerSyncCredentials } from '@powersync/web';
import AppSchema from './schema';
import { Logger, LogContext } from '@/lib/logging/client-logger';

/**
 * PowerSync client singleton
 * Manages local IndexedDB database with offline-first sync
 */
let powerSyncInstance: PowerSyncDatabase | null = null;

/**
 * Implements the PowerSyncDatabaseConnector interface to connect to your
 * backend API. This is responsible for fetching authentication tokens
 * and handling data pull/push operations.
 */
export class PowerSyncBackendConnector {
  powerSync: AbstractPowerSyncDatabase;
  private token: string;

  constructor(token: string) {
    this.powerSync = null as any;
    this.token = token;
  }

  async init(powerSync: AbstractPowerSyncDatabase): Promise<void> {
    this.powerSync = powerSync;
  }

  async fetchCredentials(): Promise<PowerSyncCredentials | null> {
    // This method is called to get the auth token for PowerSync.
    // We already have it from the NextAuth session, so we just return it.
    Logger.log(LogContext.SYSTEM, '[PowerSync] Fetching credentials...');
    if (!this.token) {
      Logger.error(LogContext.SYSTEM, '[PowerSync] No auth token available.');
      throw new Error('No auth token');
    }
    return {
      token: this.token,
      endpoint: '/api/powersync',
    };
  }

  async uploadData(database: AbstractPowerSyncDatabase): Promise<void> {
    const transaction = await database.getNextCrudTransaction();
    if (!transaction) {
      Logger.log(LogContext.SYSTEM, '[PowerSync] No data to upload.');
      return;
    }

    try {
      const changes = transaction.crud.map((op) => ({
        op: op.op,
        type: op.table,
        id: op.id,
        data: op.op === UpdateType.PUT ? op.opData : undefined,
      }));

      Logger.log(LogContext.SYSTEM, `[PowerSync] Uploading ${changes.length} changes...`);

      const response = await fetch('/api/powersync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.token}`,
        },
        body: JSON.stringify({ changes }),
      });

      if (!response.ok) {
        throw new Error(`Failed to upload data: ${response.status}`);
      }

      await transaction.complete();
      Logger.log(LogContext.SYSTEM, '[PowerSync] Data upload complete.');
    } catch (error) {
      Logger.error(LogContext.SYSTEM, '[PowerSync] Data upload failed', { error });
      // Don't complete the transaction, so it will be retried
      throw error;
    }
  }
}

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