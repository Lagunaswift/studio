'use client';

import { useState, useEffect } from 'react';

interface PWAState {
  isInstalled: boolean;
  isInstallable: boolean;
  isOnline: boolean;
  needsUpdate: boolean;
}

export function usePWA() {
  const [state, setState] = useState<PWAState>({
    isInstalled: false,
    isInstallable: false,
    isOnline: true,
    needsUpdate: false
  });

  useEffect(() => {
    // Check if installed
    const checkInstalled = () => {
      const isInstalled = window.matchMedia('(display-mode: standalone)').matches ||
                         (window.navigator as any).standalone === true;
      setState(prev => ({ ...prev, isInstalled }));
    };

    // Check online status
    const updateOnlineStatus = () => {
      setState(prev => ({ ...prev, isOnline: navigator.onLine }));
    };

    // Check for updates
    const checkForUpdates = async () => {
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.getRegistration();
        if (registration?.waiting) {
          setState(prev => ({ ...prev, needsUpdate: true }));
        }
      }
    };

    // Initial checks
    checkInstalled();
    updateOnlineStatus();
    checkForUpdates();

    // Listen for install prompt
    const handleBeforeInstallPrompt = () => {
      setState(prev => ({ ...prev, isInstallable: true }));
    };

    // Listen for installation
    const handleAppInstalled = () => {
      setState(prev => ({ ...prev, isInstalled: true, isInstallable: false }));
    };

    // Listen for online/offline
    const handleOnline = () => updateOnlineStatus();
    const handleOffline = () => updateOnlineStatus();

    // Listen for service worker updates
    const handleServiceWorkerUpdate = () => {
      setState(prev => ({ ...prev, needsUpdate: true }));
    };

    // Add event listeners
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Service worker update detection
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('controllerchange', handleServiceWorkerUpdate);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.removeEventListener('controllerchange', handleServiceWorkerUpdate);
      }
    };
  }, []);

  const updateApp = async () => {
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration?.waiting) {
        registration.waiting.postMessage({ type: 'SKIP_WAITING' });
        window.location.reload();
      }
    }
  };

  const registerForNotifications = async (): Promise<boolean> => {
    if (!('Notification' in window) || !('serviceWorker' in navigator)) {
      return false;
    }

    try {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
        });

        // Send subscription to your backend
        await fetch('/api/notifications/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(subscription)
        });

        return true;
      }
    } catch (error) {
      console.error('Notification registration failed:', error);
    }

    return false;
  };

  return {
    ...state,
    updateApp,
    registerForNotifications
  };
}
