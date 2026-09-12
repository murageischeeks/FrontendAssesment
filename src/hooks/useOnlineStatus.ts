import { useState, useEffect } from 'react';

// This hook listens to the browser's built-in online/offline events.
// navigator.onLine is true when connected, false when not.
// The browser fires "online" and "offline" events on the window
// whenever the connection state changes.
export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const goOnline = () => setIsOnline(true);
    const goOffline = () => setIsOnline(false);

    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);

    // Clean up the listeners when the component unmounts
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  return isOnline;
}
