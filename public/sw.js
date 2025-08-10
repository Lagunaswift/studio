const CACHE_NAME = 'mealplanner-v2.0.0';
const STATIC_CACHE = 'mealplanner-static-v2';
const DYNAMIC_CACHE = 'mealplanner-dynamic-v2';
const API_CACHE = 'mealplanner-api-v2';
const IMAGE_CACHE = 'mealplanner-images-v2';

// Enhanced static assets list
const STATIC_ASSETS = [
  '/',
  '/dashboard',
  '/dashboard/recipes',
  '/dashboard/meal-plan',
  '/offline',
  '/manifest.json'
];

// Install event with better error handling
self.addEventListener('install', (event) => {
  console.log('🔧 Service Worker installing...');
  
  event.waitUntil(
    Promise.all([
      caches.open(STATIC_CACHE).then(cache => cache.addAll(STATIC_ASSETS)),
      caches.open(IMAGE_CACHE),
      caches.open(API_CACHE),
      caches.open(DYNAMIC_CACHE)
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

// Enhanced fetch handler with proper strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // Skip Chrome extensions
  if (url.protocol === 'chrome-extension:') return;

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

// Network First for API (with timeout)
async function handleAPIRequest(request) {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout
    
    const networkResponse = await fetch(request, { 
      signal: controller.signal 
    });
    clearTimeout(timeoutId);
    
    if (networkResponse.ok) {
      const cache = await caches.open(API_CACHE);
      cache.put(request, networkResponse.clone());
      return networkResponse;
    }
    throw new Error('Network response not ok');
    
  } catch (error) {
    console.log('📡 API network failed, trying cache:', request.url);
    const cachedResponse = await caches.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // ✅ FIX: Add proper offline response
    return new Response(
      JSON.stringify({ 
        error: 'Offline', 
        message: 'This feature requires an internet connection',
        offline: true 
      }),
      {
        status: 503,
        statusText: 'Service Unavailable',
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

// Stale While Revalidate for pages
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
      const offlineResponse = await caches.match('/offline');
      return offlineResponse || new Response('Offline', { status: 503 });
    }
    throw error;
  }
}

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  if (event.tag === 'meal-plan-sync') {
    event.waitUntil(syncOfflineActions());
  }
});

async function syncOfflineActions() {
  // Implement offline action sync
  console.log('🔄 Syncing offline actions...');
}
