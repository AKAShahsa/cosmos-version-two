// Mobile Sync Utilities - Enhanced synchronization for mobile devices
// This handles aggressive syncing to overcome mobile browser limitations

interface SyncState {
  lastSyncTime: number;
  syncAttempts: number;
  isActive: boolean;
}

class MobileSyncManager {
  private syncState: SyncState = {
    lastSyncTime: 0,
    syncAttempts: 0,
    isActive: false
  };

  private intervals: NodeJS.Timeout[] = [];

  // Start aggressive mobile sync
  startSync(
    playerRef: any,
    roomState: any,
    forceSyncCallback: () => void,
    isMobile: boolean
  ) {
    if (!isMobile || this.syncState.isActive) return;

    console.log('🔄 Starting mobile sync manager...');
    this.syncState.isActive = true;

    // Primary sync - every 2 seconds
    const primarySync = setInterval(() => {
      if (playerRef.current && roomState?.currentTrack) {
        this.performSync(playerRef, roomState, forceSyncCallback);
      }
    }, 2000);

    // Background sync - every 5 seconds (more resilient)
    const backgroundSync = setInterval(() => {
      if (document.hidden && playerRef.current && roomState?.currentTrack) {
        console.log('📱 Background sync while minimized');
        this.performSync(playerRef, roomState, forceSyncCallback);
      }
    }, 5000);

    // Emergency sync - every 10 seconds for severe drift
    const emergencySync = setInterval(() => {
      this.emergencySync(playerRef, roomState);
    }, 10000);

    this.intervals = [primarySync, backgroundSync, emergencySync];
  }

  // Stop all sync processes
  stopSync() {
    console.log('🛑 Stopping mobile sync manager...');
    this.intervals.forEach(interval => clearInterval(interval));
    this.intervals = [];
    this.syncState.isActive = false;
  }

  // Perform sync operation
  private performSync(_playerRef: any, _roomState: any, forceSyncCallback: () => void) {
    try {
      const now = Date.now();
      
      // Prevent too frequent syncing (minimum 1 second between syncs)
      if (now - this.syncState.lastSyncTime < 1000) return;

      forceSyncCallback();
      this.syncState.lastSyncTime = now;
      this.syncState.syncAttempts++;
      
      // Log sync activity
      if (this.syncState.syncAttempts % 10 === 0) {
        console.log(`📱 Mobile sync: ${this.syncState.syncAttempts} attempts completed`);
      }
    } catch (error) {
      console.error('❌ Mobile sync error:', error);
    }
  }

  // Emergency sync for severe time drift
  private emergencySync(playerRef: any, roomState: any) {
    if (!playerRef.current || !roomState?.currentTrack) return;

    try {
      const currentPlayerTime = playerRef.current.getCurrentTime?.() || 0;
      const roomTime = roomState.currentTime || 0;
      const timeDiff = Math.abs(currentPlayerTime - roomTime);

      // If drift is more than 10 seconds, force emergency sync
      if (timeDiff > 10) {
        console.log('🚨 Emergency sync - severe drift detected:', timeDiff);
        playerRef.current.seekTo(roomTime, true);
        
        // Ensure play state is correct
        const playerState = playerRef.current.getPlayerState?.();
        const isCurrentlyPlaying = playerState === 1;
        
        if (roomState.isPlaying && !isCurrentlyPlaying) {
          playerRef.current.playVideo();
        } else if (!roomState.isPlaying && isCurrentlyPlaying) {
          playerRef.current.pauseVideo();
        }
      }
    } catch (error) {
      console.error('❌ Emergency sync error:', error);
    }
  }

  // Get sync statistics
  getSyncStats() {
    return {
      ...this.syncState,
      intervalsActive: this.intervals.length
    };
  }
}

// Export singleton instance
export const mobileSyncManager = new MobileSyncManager();

// Utility functions for mobile detection and optimization
export const isMobileDevice = (): boolean => {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
};

export const isBackgroundModeSupported = (): boolean => {
  return 'wakeLock' in navigator || 'serviceWorker' in navigator;
};

export const preventMobileSleep = async (): Promise<any> => {
  if ('wakeLock' in navigator) {
    try {
      const wakeLock = await (navigator as any).wakeLock.request('screen');
      console.log('📱 Wake lock activated');
      return wakeLock;
    } catch (error) {
      console.log('⚠️ Wake lock failed:', error);
      return null;
    }
  }
  return null;
};
