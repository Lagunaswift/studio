// public/sw.js - Enhanced version
const CACHE_NAME = 'mealplanner-v2.1.0';
const STATIC_CACHE = 'mealplanner-static-v2.1';
const DYNAMIC_CACHE = 'mealplanner-dynamic-v2.1';
const API_CACHE = 'mealplanner-api-v2.1';
const IMAGE_CACHE = 'mealplanner-images-v2.1';
const DATA_CACHE = 'mealplanner-data-v2.1';

// Enhanced static assets list for PWA
const STATIC_ASSETS = [
  '/',
  '/dashboard',
  '/dashboard/recipes',
  '/dashboard/meal-plan',
  '/pantry',
  '/profile',
  '/offline',
  '/manifest.json',
  '/icon-192x192.png',
  '/icon-512x512.png',
  // Add critical CSS and JS files
  '/_next/static/css/app/layout.css', // Adjust path as needed
  '/_next/static/chunks/webpack.js',
  '/_next/static/chunks/main.js'
];

// Critical API endpoints that need caching
const CRITICAL_API_ENDPOINTS = [
  '/api/auth/session',
  '/api/user/profile',
  '/api/recipes',
  '/api/meal-plans'
];

// Install event with comprehensive caching
self.addEventListener('install', (event) => {
  console.log('🔧 Service Worker installing v2.1.0...');
  
  event.waitUntil(
    Promise.all([
      // Cache static assets
      caches.open(STATIC_CACHE).then(cache => 
        cache.addAll(STATIC_ASSETS).catch(error => {
          console.warn('Some static assets failed to cache:', error);
          // Don't fail installation for missing assets
        })
      ),
      // Initialize other caches
      caches.open(IMAGE_CACHE),
      caches.open(API_CACHE),
      caches.open(DYNAMIC_CACHE),
      caches.open(DATA_CACHE)
    ])
    .then(() => {
      console.log('✅ All caches initialized');
      return self.skipWaiting();
    })
    .catch(error => {
      console.error('❌ Cache initialization failed:', error);
    })
  );
});

// Activate event with cache cleanup
self.addEventListener('activate', (event) => {
  console.log('🔧 Service Worker activating...');
  
  event.waitUntil(
    Promise.all([
      // Clean up old caches
      caches.keys().then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            if (cacheName.includes('mealplanner') && 
                ![STATIC_CACHE, DYNAMIC_CACHE, API_CACHE, IMAGE_CACHE, DATA_CACHE].includes(cacheName)) {
              console.log('🗑️ Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      }),
      // Claim all clients
      self.clients.claim()
    ])
    .then(() => {
      console.log('✅ Service Worker activated and claimed clients');
    })
  );
});

// Enhanced fetch handler with better strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // Skip Chrome extensions and other protocols
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return;

  // Skip manifest in dev environments
  if (url.pathname === '/manifest.json' && url.hostname.includes('cloudworkstations.dev')) {
    return;
  }

  // Route to appropriate cache strategy
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(handleAPIRequest(request));
  } else if (url.pathname.match(/\.(jpg|jpeg|png|gif|webp|svg|ico)$/)) {
    event.respondWith(handleImageRequest(request));
  } else if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(handleStaticAssets(request));
  } else {
    event.respondWith(handlePageRequest(request));
  }
});

// Network First with Enhanced Timeout for API
async function handleAPIRequest(request) {
  const url = new URL(request.url);
  const isCriticalEndpoint = CRITICAL_API_ENDPOINTS.some(endpoint => 
    url.pathname.startsWith(endpoint)
  );
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000); // 8s timeout for APIs
    
    const networkResponse = await fetch(request, { 
      signal: controller.signal 
    });
    clearTimeout(timeoutId);
    
    if (networkResponse.ok) {
      // Cache successful responses
      const cache = await caches.open(isCriticalEndpoint ? DATA_CACHE : API_CACHE);
      cache.put(request, networkResponse.clone());
      return networkResponse;
    }
    throw new Error(`Network response not ok: ${networkResponse.status}`);
    
  } catch (error) {
    console.log('📡 API network failed, trying cache:', request.url);
    
    // Try critical data cache first, then API cache
    const cacheResponse = await caches.match(request, {
      cacheName: isCriticalEndpoint ? DATA_CACHE : API_CACHE
    }) || await caches.match(request);
    
    if (cacheResponse) {
      console.log('✅ Serving API from cache:', request.url);
      return cacheResponse;
    }
    
    // Enhanced offline response for different API types
    const offlineResponse = {
      error: 'Offline',
      message: 'This feature requires an internet connection',
      offline: true,
      timestamp: new Date().toISOString()
    };
    
    // Add specific handling for auth endpoints
    if (url.pathname.includes('/auth/')) {
      offlineResponse.message = 'Authentication requires an internet connection';
    } else if (url.pathname.includes('/ai/') || url.pathname.includes('/genkit/')) {
      offlineResponse.message = 'AI features require an internet connection';
    }
    
    return new Response(JSON.stringify(offlineResponse), {
      status: 503,
      statusText: 'Service Unavailable',
      headers: { 
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache'
      }
    });
  }
}

// Cache First for Images with fallback
async function handleImageRequest(request) {
  try {
    const cache = await caches.open(IMAGE_CACHE);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      // Optionally update cache in background
      fetch(request).then(response => {
        if (response.ok) {
          cache.put(request, response.clone());
        }
      }).catch(() => {}); // Silent background update
      
      return cachedResponse;
    }
    
    // Network fallback
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
    
  } catch (error) {
    // Return placeholder image or empty response
    console.warn('Image fetch failed:', request.url);
    return new Response('', { status: 404, statusText: 'Image Not Found' });
  }
}

// Cache First for Static Assets
async function handleStaticAssets(request) {
  try {
    const cache = await caches.open(STATIC_CACHE);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
    
  } catch (error) {
    console.warn('Static asset fetch failed:', request.url);
    throw error;
  }
}

// Stale While Revalidate for Pages
async function handlePageRequest(request) {
  const cache = await caches.open(DYNAMIC_CACHE);
  const cachedResponse = await cache.match(request);
  
  if (cachedResponse) {
    // Return cached version immediately
    fetch(request)
      .then(response => {
        if (response.ok) {
          cache.put(request, response.clone());
        }
      })
      .catch(() => {}); // Silent background update
    
    return cachedResponse;
  }
  
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    // Return offline page for navigation requests
    if (request.mode === 'navigate') {
      const offlineResponse = await cache.match('/offline');
      if (offlineResponse) {
        return offlineResponse;
      }
      
      // Fallback offline page
      return new Response(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Offline - MealPreppyPro</title>
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <style>
              body { font-family: -apple-system, sans-serif; text-align: center; padding: 50px; }
              .offline-content { max-width: 400px; margin: 0 auto; }
              .icon { font-size: 64px; margin-bottom: 20px; }
              h1 { color: #333; margin-bottom: 10px; }
              p { color: #666; line-height: 1.6; }
              .retry-btn { 
                background: #007AFF; color: white; border: none; 
                padding: 12px 24px; border-radius: 6px; font-size: 16px;
                cursor: pointer; margin-top: 20px;
              }
            </style>
          </head>
          <body>
            <div class="offline-content">
              <div class="icon">📱</div>
              <h1>You're Offline</h1>
              <p>MealPreppyPro works offline! Your data is saved locally and will sync when you reconnect.</p>
              <button class="retry-btn" onclick="window.location.reload()">Retry Connection</button>
            </div>
          </body>
        </html>
      `, {
        status: 200,
        headers: { 'Content-Type': 'text/html' }
      });
    }
    throw error;
  }
}

// Enhanced background sync
self.addEventListener('sync', (event) => {
  console.log('🔄 Background sync triggered:', event.tag);
  
  if (event.tag === 'meal-plan-sync') {
    event.waitUntil(syncMealPlans());
  } else if (event.tag === 'offline-actions-sync') {
    event.waitUntil(syncOfflineActions());
  } else if (event.tag === 'user-data-sync') {
    event.waitUntil(syncUserData());
  }
});

async function syncMealPlans() {
  try {
    console.log('🔄 Syncing meal plans...');
    // Implementation would sync meal plans from IndexedDB to Firebase
    // This would be called from your app when actions are queued
  } catch (error) {
    console.error('❌ Meal plan sync failed:', error);
  }
}

async function syncOfflineActions() {
  try {
    console.log('🔄 Syncing offline actions...');
    // Implementation would process queued offline actions
  } catch (error) {
    console.error('❌ Offline actions sync failed:', error);
  }
}

async function syncUserData() {
  try {
    console.log('🔄 Syncing user data...');
    // Implementation would sync user profile and settings
  } catch (error) {
    console.error('❌ User data sync failed:', error);
  }
}

// Push notifications (for future use)
self.addEventListener('push', (event) => {
  if (event.data) {
    const data = event.data.json();
    const options = {
      body: data.body,
      icon: '/icon-192x192.png',
      badge: '/icon-192x192.png',
      tag: data.tag || 'notification',
      requireInteraction: false,
      actions: data.actions || []
    };
    
    event.waitUntil(
      self.registration.showNotification(data.title || 'MealPreppyPro', options)
    );
  }
});

// Notification click handling
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  event.waitUntil(
    clients.openWindow(event.notification.data?.url || '/')
  );
});

console.log('🚀 Service Worker v2.1.0 loaded successfully');
