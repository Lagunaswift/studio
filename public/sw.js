const CACHE_NAME = 'mealplanner-v1.0.0';
const STATIC_CACHE = 'mealplanner-static-v1';
const DYNAMIC_CACHE = 'mealplanner-dynamic-v1';
const API_CACHE = 'mealplanner-api-v1';

// Files to cache immediately
const STATIC_ASSETS = [
  '/',
  '/dashboard',
  '/dashboard/recipes',
  '/dashboard/meal-plan',
  '/offline',
  '/manifest.json',
  // Add your key CSS and JS files
  '/_next/static/css/app.css',
  '/_next/static/chunks/main.js',
  // Icons
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png'
];

// API routes to cache
const API_ROUTES = [
  '/api/profile',
  '/api/recipes',
  '/api/meal-plans'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('🔧 Service Worker installing...');
  
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('📦 Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('✅ Static assets cached successfully');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('❌ Static cache failed:', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('🚀 Service Worker activating...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== STATIC_CACHE && 
                cacheName !== DYNAMIC_CACHE && 
                cacheName !== API_CACHE) {
              console.log('🗑️ Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('✅ Service Worker activated');
        return self.clients.claim();
      })
  );
});

// Fetch event - implement caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip Chrome extension requests
  if (url.protocol === 'chrome-extension:') {
    return;
  }

  // Handle different types of requests
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(handleAPIRequest(request));
  } else if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(handleStaticAssets(request));
  } else if (url.pathname.startsWith('/dashboard')) {
    event.respondWith(handleDashboardPages(request));
  } else {
    event.respondWith(handleOtherRequests(request));
  }
});

// API requests - Network First with cache fallback
async function handleAPIRequest(request) {
  const url = new URL(request.url);
  
  try {
    // Try network first
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      // Cache successful responses
      const cache = await caches.open(API_CACHE);
      const responseClone = networkResponse.clone();
      
      // Only cache GET requests for specific endpoints
      if (API_ROUTES.some(route => url.pathname.startsWith(route))) {
        cache.put(request, responseClone);
      }
      
      return networkResponse;
    }
    
    throw new Error('Network response not ok');
  } catch (error) {
    // Network failed, try cache
    console.log('📡 Network failed, trying cache for:', url.pathname);
    
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Return offline response for API calls
    return new Response(
      JSON.stringify({ 
        error: 'Offline', 
        message: 'This feature is not available offline' 
      }),
      {
        status: 503,
        statusText: 'Service Unavailable',
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
  }
}

// Static assets - Cache First
async function handleStaticAssets(request) {
  const cachedResponse = await caches.match(request);
  
  if (cachedResponse) {
    return cachedResponse;
  }
  
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const cache = await caches.open(STATIC_CACHE);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.error('Failed to fetch static asset:', request.url);
    return new Response('Asset not available offline', { status: 404 });
  }
}

// Dashboard pages - Stale While Revalidate
async function handleDashboardPages(request) {
  const cachedResponse = await caches.match(request);
  
  // Return cached version immediately if available
  if (cachedResponse) {
    // Update cache in background
    fetch(request)
      .then(response => {
        if (response.ok) {
          const cache = caches.open(DYNAMIC_CACHE);
          cache.then(c => c.put(request, response));
        }
      })
      .catch(() => {
        // Ignore network failures in background
      });
    
    return cachedResponse;
  }
  
  // No cache, try network
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    // Network failed and no cache, return offline page
    return caches.match('/offline') || new Response('Page not available offline');
  }
}

// Other requests - Network First
async function handleOtherRequests(request) {
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    const cachedResponse = await caches.match(request);
    return cachedResponse || caches.match('/offline');
  }
}

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  console.log('🔄 Background sync triggered:', event.tag);
  
  if (event.tag === 'sync-meal-plans') {
    event.waitUntil(syncMealPlans());
  } else if (event.tag === 'sync-recipes') {
    event.waitUntil(syncRecipes());
  }
});

// Push notification handler
self.addEventListener('push', (event) => {
  console.log('📢 Push notification received');
  
  const options = {
    body: 'Time to log your meal!',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    vibrate: [200, 100, 200],
    data: {
      url: '/dashboard/meal-plan'
    },
    actions: [
      {
        action: 'log-meal',
        title: 'Log Meal',
        icon: '/icons/action-log.png'
      },
      {
        action: 'dismiss',
        title: 'Dismiss',
        icon: '/icons/action-dismiss.png'
      }
    ]
  };
  
  if (event.data) {
    const data = event.data.json();
    options.body = data.body || options.body;
    options.data = { ...options.data, ...data };
  }
  
  event.waitUntil(
    self.registration.showNotification('MealPlannerPro', options)
  );
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  console.log('📱 Notification clicked:', event.action);
  
  event.notification.close();
  
  if (event.action === 'log-meal') {
    event.waitUntil(
      clients.openWindow('/dashboard/meal-plan?action=log')
    );
  } else if (event.action === 'dismiss') {
    // Just close the notification
    return;
  } else {
    // Default action - open the app
    event.waitUntil(
      clients.openWindow(event.notification.data?.url || '/dashboard')
    );
  }
});

// Sync functions
async function syncMealPlans() {
  try {
    // Get offline stored meal plans from IndexedDB
    const offlineData = await getOfflineData('meal-plans');
    
    for (const item of offlineData) {
      try {
        await fetch('/api/meal-plans', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(item.data)
        });
        
        // Remove from offline storage after successful sync
        await removeOfflineData('meal-plans', item.id);
      } catch (error) {
        console.error('Failed to sync meal plan:', error);
      }
    }
  } catch (error) {
    console.error('Meal plan sync failed:', error);
  }
}

async function syncRecipes() {
  try {
    const offlineData = await getOfflineData('recipes');
    
    for (const item of offlineData) {
      try {
        await fetch('/api/recipes', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(item.data)
        });
        
        await removeOfflineData('recipes', item.id);
      } catch (error) {
        console.error('Failed to sync recipe:', error);
      }
    }
  } catch (error) {
    console.error('Recipe sync failed:', error);
  }
}

// IndexedDB helpers for offline storage
async function getOfflineData(storeName) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('MealPlannerOffline', 1);
    
    request.onerror = () => reject(request.error);
    
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const getAllRequest = store.getAll();
      
      getAllRequest.onsuccess = () => resolve(getAllRequest.result);
      getAllRequest.onerror = () => reject(getAllRequest.error);
    };
    
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(storeName)) {
        db.createObjectStore(storeName, { keyPath: 'id', autoIncrement: true });
      }
    };
  });
}

async function removeOfflineData(storeName, id) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('MealPlannerOffline', 1);
    
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const deleteRequest = store.delete(id);
      
      deleteRequest.onsuccess = () => resolve();
      deleteRequest.onerror = () => reject(deleteRequest.error);
    };
  });
}

// Message handler for client communication
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
