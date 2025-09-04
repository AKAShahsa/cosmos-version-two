import { useEffect, useState } from 'react';
import { useRoom } from '../contexts/RoomContext';

export const useRoomPersistence = () => {
  const { roomState, currentUser } = useRoom();

  // Save room state to localStorage
  useEffect(() => {
    if (roomState && currentUser) {
      const roomData = {
        roomId: roomState.id,
        userId: currentUser.id,
        userName: currentUser.name,
        timestamp: Date.now()
      };
      localStorage.setItem('musicPlayerRoom', JSON.stringify(roomData));
    }
  }, [roomState, currentUser]);

  // Auto-reconnect DISABLED to prevent infinite loops
  // TODO: Fix auto-reconnect logic later
  useEffect(() => {
    // Disabled auto-reconnect to prevent hanging
    console.log('🔄 Auto-reconnect disabled to prevent loops');
  }, []);

  // Clear room data when leaving
  const clearRoomData = () => {
    localStorage.removeItem('musicPlayerRoom');
  };

  return { clearRoomData };
};

export const useLeaveConfirmation = () => {
  const { roomState, leaveCurrentRoom } = useRoom();
  const { clearRoomData } = useRoomPersistence();
  const [showLeavePopup, setShowLeavePopup] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<(() => void) | null>(null);

  const handleLeaveConfirm = () => {
    leaveCurrentRoom();
    clearRoomData();
    setShowLeavePopup(false);
    
    // Execute pending navigation if any
    if (pendingNavigation) {
      pendingNavigation();
      setPendingNavigation(null);
    }
  };

  const handleLeaveCancel = () => {
    setShowLeavePopup(false);
    setPendingNavigation(null);
    // Stay on current page
    window.history.pushState(null, '', window.location.href);
  };

  useEffect(() => {
    if (!roomState) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = 'Are you sure you want to leave the music room?';
      return 'Are you sure you want to leave the music room?';
    };

    const handlePopState = (e: PopStateEvent) => {
      e.preventDefault();
      
      // Show custom popup instead of window.confirm
      setPendingNavigation(() => () => window.history.go(-1));
      setShowLeavePopup(true);
    };

    // Add event listeners
    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('popstate', handlePopState);

    // Push current state to enable back button detection
    window.history.pushState(null, '', window.location.href);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('popstate', handlePopState);
    };
  }, [roomState, leaveCurrentRoom, clearRoomData]);

  return {
    showLeavePopup,
    handleLeaveConfirm,
    handleLeaveCancel
  };
};
