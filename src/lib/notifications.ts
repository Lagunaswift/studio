class NotificationManager {
  private swRegistration: ServiceWorkerRegistration | null = null;

  async initialize(): Promise<boolean> {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      console.warn('Push notifications not supported');
      return false;
    }

    try {
      this.swRegistration = await navigator.serviceWorker.ready;
      return true;
    } catch (error) {
      console.error('Failed to initialize notifications:', error);
      return false;
    }
  }

  async requestPermission(): Promise<boolean> {
    if (!('Notification' in window)) {
      return false;
    }

    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }

  async subscribeToPush(): Promise<PushSubscription | null> {
    if (!this.swRegistration) {
      await this.initialize();
    }

    if (!this.swRegistration) {
      return null;
    }

    try {
      const subscription = await this.swRegistration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
      });

      // Send subscription to backend
      await this.sendSubscriptionToServer(subscription);
      return subscription;
    } catch (error) {
      console.error('Failed to subscribe to push:', error);
      return null;
    }
  }

  private async sendSubscriptionToServer(subscription: PushSubscription) {
    await fetch('/api/notifications/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(subscription)
    });
  }

  async scheduleMealReminder(meal: {
    name: string;
    time: string;
    type: string;
  }) {
    if (!this.swRegistration) return;

    // Schedule local notification
    const options = {
      body: `Time for ${meal.name}! 🍽️`,
      icon: '/icons/icon-192x192.png',
      badge: '/icons/badge-72x72.png',
      tag: `meal-${meal.type}`,
      requireInteraction: true,
      actions: [
        { action: 'mark-eaten', title: 'Mark as Eaten' },
        { action: 'snooze', title: 'Remind in 15 min' }
      ]
    };

    this.swRegistration.showNotification(
      `${meal.type} Reminder`,
      options
    );
  }

  async scheduleShoppingReminder(items: string[]) {
    if (!this.swRegistration) return;

    const options = {
      body: `Don't forget to buy: ${items.slice(0, 3).join(', ')}${items.length > 3 ? '...' : ''}`,
      icon: '/icons/icon-192x192.png',
      tag: 'shopping-reminder',
      actions: [
        { action: 'view-list', title: 'View List' },
        { action: 'dismiss', title: 'Dismiss' }
      ]
    };

    this.swRegistration.showNotification(
      'Shopping Reminder 🛒',
      options
    );
  }
}

export const notificationManager = new NotificationManager();
