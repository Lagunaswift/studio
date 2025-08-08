class BackgroundSyncManager {
  private offlineActions: Array<{
    id: string;
    action: string;
    data: any;
    timestamp: number;
  }> = [];

  constructor() {
    this.loadOfflineActions();
  }

  // Register background sync
  async registerSync(tag: string): Promise<boolean> {
    if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
      try {
        const registration = await navigator.serviceWorker.ready;
        await registration.sync.register(tag);
        return true;
      } catch (error) {
        console.error('Background sync registration failed:', error);
        return false;
      }
    }
    return false;
  }

  // Queue offline actions
  async queueAction(action: string, data: any): Promise<void> {
    const actionItem = {
      id: crypto.randomUUID(),
      action,
      data,
      timestamp: Date.now()
    };

    this.offlineActions.push(actionItem);
    this.saveOfflineActions();

    // Try to sync immediately if online
    if (navigator.onLine) {
      await this.syncOfflineActions();
    } else {
      // Register for background sync when back online
      await this.registerSync('offline-actions-sync');
    }
  }

  // Process offline actions when back online
  async syncOfflineActions(): Promise<void> {
    if (this.offlineActions.length === 0) return;

    console.log('🔄 Syncing', this.offlineActions.length, 'offline actions...');

    for (const actionItem of this.offlineActions) {
      try {
        await this.processAction(actionItem);
        
        // Remove successful action
        this.offlineActions = this.offlineActions.filter(a => a.id !== actionItem.id);
      } catch (error) {
        console.error('Failed to sync action:', actionItem.action, error);
        // Keep failed actions for retry
      }
    }

    this.saveOfflineActions();
  }

  private async processAction(actionItem: any): Promise<void> {
    const { action, data } = actionItem;

    switch (action) {
      case 'ADD_MEAL_TO_PLAN':
        await fetch('/api/meal-plan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });
        break;

      case 'UPDATE_MEAL_STATUS':
        await fetch(`/api/meal-plan/${data.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });
        break;

      case 'ADD_PANTRY_ITEM':
        await fetch('/api/pantry', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });
        break;

      case 'TOGGLE_SHOPPING_ITEM':
        await fetch(`/api/shopping-list/${data.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ completed: data.completed })
        });
        break;

      default:
        console.warn('Unknown offline action:', action);
    }
  }

  private loadOfflineActions(): void {
    try {
      const stored = localStorage.getItem('offline-actions');
      if (stored) {
        this.offlineActions = JSON.parse(stored);
      }
    } catch (error) {
      console.error('Failed to load offline actions:', error);
      this.offlineActions = [];
    }
  }

  private saveOfflineActions(): void {
    try {
      localStorage.setItem('offline-actions', JSON.stringify(this.offlineActions));
    } catch (error) {
      console.error('Failed to save offline actions:', error);
    }
  }

  // Get pending actions count for UI display
  getPendingActionsCount(): number {
    return this.offlineActions.length;
  }
}

export const backgroundSyncManager = new BackgroundSyncManager();

// React hook for offline actions
export function useOfflineActions() {
  const [pendingCount, setPendingCount] = useState(0);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const updatePendingCount = () => {
      setPendingCount(backgroundSyncManager.getPendingActionsCount());
    };

    const handleOnline = () => {
      setIsOnline(true);
      backgroundSyncManager.syncOfflineActions().then(updatePendingCount);
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    // Initial count
    updatePendingCount();

    // Listen for online/offline events
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Periodic count updates
    const interval = setInterval(updatePendingCount, 5000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, []);

  return {
    pendingCount,
    isOnline,
    queueAction: backgroundSyncManager.queueAction.bind(backgroundSyncManager)
  };
}
