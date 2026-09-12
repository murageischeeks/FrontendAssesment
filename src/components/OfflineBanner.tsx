/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useState } from 'react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { WifiOff, Wifi } from 'lucide-react';
import './OfflineBanner.css';

export const OfflineBanner = () => {
  const isOnline = useOnlineStatus();

  // We track whether the user *was* offline so we can show
  // a "back online" confirmation before hiding the banner.
  const [wasOffline, setWasOffline] = useState(false);
  const [showReconnected, setShowReconnected] = useState(false);

  useEffect(() => {
    if (!isOnline) {
      // Just went offline — remember that
      setWasOffline(true);
      setShowReconnected(false);
    } else if (wasOffline) {
      // Just came back online after being offline — show the success toast
      setShowReconnected(true);
      // Auto-hide the "back online" message after 3 seconds
      const timer = setTimeout(() => {
        setShowReconnected(false);
        setWasOffline(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isOnline, wasOffline]);

  // Don't render anything if we're online and there's nothing to show
  if (isOnline && !showReconnected) return null;

  return (
    <div
      className={`offline-banner ${!isOnline ? 'offline-banner--offline' : 'offline-banner--online'}`}
      role="status"
      aria-live="polite"
    >
      {!isOnline ? (
        <>
          <WifiOff size={15} aria-hidden="true" />
          <span>You're offline — stock changes will not save until you reconnect.</span>
        </>
      ) : (
        <>
          <Wifi size={15} aria-hidden="true" />
          <span>Back online.</span>
        </>
      )}
    </div>
  );
};
