interface ServiceWorkerRegistration {
  sync: {
    register(tag: string): Promise<void>;
  };
  pushManager: {
    subscribe(options: any): Promise<PushSubscription>;
  };
}
