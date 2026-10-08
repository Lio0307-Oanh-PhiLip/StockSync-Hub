import { InventoryItem, SyncSourceInfo, SyncMode } from '../types';

export type CloudConnectionStatus = 'connected' | 'reconnecting' | 'offline';

export interface RealtimeSyncHandlers {
  onFullStateSync: (data: { iw: InventoryItem[]; oow: InventoryItem[]; sourceInfo: SyncSourceInfo; version: number }) => void;
  onScanPerformed: (data: { item: InventoryItem; listType: 'IW' | 'OOW'; version: number }) => void;
  onScanRemoved: (data: { itemId: string; item: InventoryItem; version: number }) => void;
  onScansCleared: (data: { version: number }) => void;
  onConnectionStatusChange?: (status: CloudConnectionStatus, onlineClients?: number) => void;
}

const STORAGE_SERVER_URL_KEY = 'stocksync_cloud_server_url';
export const DEFAULT_PRODUCTION_URL = 'https://ais-pre-3huvqp5aas56f4sanhbps6-98361429439.asia-southeast1.run.app';

/**
 * Get active Server Base URL.
 * If running inside the Android APK (stocksync.local), returns the Cloud Run endpoint.
 * If running in PC browser, returns window.location.origin.
 */
export const getCloudServerUrl = (): string => {
  if (typeof window !== 'undefined') {
    const custom = localStorage.getItem(STORAGE_SERVER_URL_KEY);
    if (custom && custom.trim().length > 0 && !custom.includes('cu7gkxvrv4htowkh5nhxq4')) {
      return custom.trim().replace(/\/+$/, '');
    }

    // Inside APK or file protocol
    if (
      window.location.hostname === 'stocksync.local' ||
      window.location.protocol.startsWith('file') ||
      (window.location.hostname === 'localhost' && window.location.port !== '3000')
    ) {
      return DEFAULT_PRODUCTION_URL;
    }

    // Standard web browser on PC/Mobile
    return window.location.origin;
  }
  return DEFAULT_PRODUCTION_URL;
};

export const setCustomServerUrl = (url: string) => {
  if (!url || url.trim() === '') {
    localStorage.removeItem(STORAGE_SERVER_URL_KEY);
  } else {
    localStorage.setItem(STORAGE_SERVER_URL_KEY, url.trim().replace(/\/+$/, ''));
  }
};

/**
 * Fetch latest full database state from server
 */
export const fetchServerState = async (): Promise<{
  iw: InventoryItem[];
  oow: InventoryItem[];
  sourceInfo: SyncSourceInfo;
  version: number;
} | null> => {
  const baseUrl = getCloudServerUrl();
  try {
    const res = await fetch(`${baseUrl}/api/sync/state`, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'x-client-id': 'stocksync-client'
      }
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn('[CloudSync] fetchServerState error:', err);
    return null;
  }
};

/**
 * Push new inventory list (Excel upload or preset change) to Cloud Server
 * Server will broadcast to all other devices (APK & PC) in real time.
 */
export const pushFullStateToServer = async (
  iw: InventoryItem[],
  oow: InventoryItem[],
  sourceInfo: SyncSourceInfo,
  mode: SyncMode = 'merge_keep_scanned'
): Promise<boolean> => {
  const baseUrl = getCloudServerUrl();
  try {
    const res = await fetch(`${baseUrl}/api/sync/upload`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-client-id': 'pc-upload'
      },
      body: JSON.stringify({ iw, oow, sourceInfo, mode })
    });
    return res.ok;
  } catch (err) {
    console.warn('[CloudSync] pushFullStateToServer error:', err);
    return false;
  }
};

/**
 * Push a scan event to Cloud Server
 */
export const pushScanToServer = async (
  scannedCode: string,
  clientId: string = 'client'
): Promise<{ success: boolean; item?: InventoryItem; error?: string }> => {
  const baseUrl = getCloudServerUrl();
  try {
    const res = await fetch(`${baseUrl}/api/sync/scan`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-client-id': clientId
      },
      body: JSON.stringify({ scannedCode, clientId })
    });
    const data = await res.json();
    return { success: res.ok, item: data.item, error: data.error };
  } catch (err: any) {
    console.warn('[CloudSync] pushScanToServer error:', err);
    return { success: false, error: err.message || 'Lỗi mạng khi gửi lượt quét' };
  }
};

/**
 * DELETE / UNDO A SCANNED ROW ON SERVER
 * When PC deletes a scanned row, the server pushes to APK so APK immediately un-scans it!
 */
export const pushRemoveScanToServer = async (
  itemId: string,
  clientId: string = 'client'
): Promise<boolean> => {
  const baseUrl = getCloudServerUrl();
  try {
    const res = await fetch(`${baseUrl}/api/sync/remove-scan`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-client-id': clientId
      },
      body: JSON.stringify({ itemId, clientId })
    });
    return res.ok;
  } catch (err) {
    console.warn('[CloudSync] pushRemoveScanToServer error:', err);
    return false;
  }
};

/**
 * Clear all scanned items on server
 */
export const pushClearScansToServer = async (clientId: string = 'client'): Promise<boolean> => {
  const baseUrl = getCloudServerUrl();
  try {
    const res = await fetch(`${baseUrl}/api/sync/clear-scans`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-client-id': clientId
      },
      body: JSON.stringify({ clientId })
    });
    return res.ok;
  } catch (err) {
    console.warn('[CloudSync] pushClearScansToServer error:', err);
    return false;
  }
};

/**
 * Reset server state to standard reference 366 items (v1.3.0)
 */
export const pushResetStandardToServer = async (): Promise<boolean> => {
  const baseUrl = getCloudServerUrl();
  try {
    const res = await fetch(`${baseUrl}/api/sync/reset-standard`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    return res.ok;
  } catch (err) {
    console.warn('[CloudSync] pushResetStandardToServer error:', err);
    return false;
  }
};

/**
 * Reset server state to default 366 items
 */
export const pushResetDefaultToServer = async (): Promise<boolean> => {
  const baseUrl = getCloudServerUrl();
  try {
    const res = await fetch(`${baseUrl}/api/sync/reset-standard`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    return res.ok;
  } catch (err) {
    console.warn('[CloudSync] pushResetDefaultToServer error:', err);
    return false;
  }
};

/**
 * Connect to Real-time SSE Stream (Push events from server to APK / PC)
 * with automatic reconnection & 3-second backup polling
 */
export const startRealtimeSync = (
  handlers: RealtimeSyncHandlers,
  currentVersionGetter: () => number
): (() => void) => {
  let eventSource: EventSource | null = null;
  let isDestroyed = false;
  let pollInterval: any = null;
  const baseUrl = getCloudServerUrl();

  const connectSSE = () => {
    if (isDestroyed) return;

    try {
      handlers.onConnectionStatusChange?.('reconnecting');
      eventSource = new EventSource(`${baseUrl}/api/sync/stream`);

      eventSource.onopen = () => {
        handlers.onConnectionStatusChange?.('connected');
      };

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'CONNECTED') {
            handlers.onConnectionStatusChange?.('connected', data.onlineClients);
            // Check if client version is behind
            if (data.version && data.version > currentVersionGetter()) {
              fetchServerState().then(latest => {
                if (latest && !isDestroyed) {
                  handlers.onFullStateSync(latest);
                }
              });
            }
          } else if (data.type === 'SYNC_FULL_STATE') {
            if (data.payload) {
              handlers.onFullStateSync(data.payload);
            }
          } else if (data.type === 'SCAN_PERFORMED') {
            if (data.payload?.item) {
              handlers.onScanPerformed(data.payload);
            }
          } else if (data.type === 'SCAN_REMOVED') {
            if (data.payload?.itemId) {
              handlers.onScanRemoved(data.payload);
            }
          } else if (data.type === 'SCANS_CLEARED') {
            handlers.onScansCleared(data.payload || {});
          }
        } catch (e) {
          console.error('[CloudSync] Error parsing SSE message:', e);
        }
      };

      eventSource.onerror = () => {
        handlers.onConnectionStatusChange?.('reconnecting');
        if (eventSource) {
          eventSource.close();
          eventSource = null;
        }
        // Retry connect after 4 seconds
        if (!isDestroyed) {
          setTimeout(connectSSE, 4000);
        }
      };
    } catch (e) {
      handlers.onConnectionStatusChange?.('offline');
      if (!isDestroyed) {
        setTimeout(connectSSE, 5000);
      }
    }
  };

  connectSSE();

  // Heartbeat polling fallback every 3 seconds to guarantee 100% sync consistency
  pollInterval = setInterval(async () => {
    if (isDestroyed) return;
    try {
      const res = await fetch(`${baseUrl}/api/health`);
      if (res.ok) {
        const health = await res.json();
        handlers.onConnectionStatusChange?.('connected', health.onlineClients);
        if (health.version > currentVersionGetter()) {
          const full = await fetchServerState();
          if (full && !isDestroyed) {
            handlers.onFullStateSync(full);
          }
        }
      } else {
        handlers.onConnectionStatusChange?.('reconnecting');
      }
    } catch {
      handlers.onConnectionStatusChange?.('reconnecting');
    }
  }, 3500);

  return () => {
    isDestroyed = true;
    if (eventSource) {
      try {
        eventSource.close();
      } catch {}
    }
    if (pollInterval) {
      clearInterval(pollInterval);
    }
  };
};
