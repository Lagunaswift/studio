import { 
  doc, 
  getDoc, 
  getDocs, 
  query, 
  collection, 
  where, 
  orderBy, 
  limit, 
  startAfter, 
  DocumentSnapshot,
  QueryDocumentSnapshot,
  onSnapshot,
  Unsubscribe
} from 'firebase/firestore';
import { db } from '@/lib/firebase-client';
import { batchManager } from './BatchManager';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

interface PaginationState {
  lastVisible: QueryDocumentSnapshot | null;
  hasMore: boolean;
  loading: boolean;
}

class OptimizedFirestore {
  private cache = new Map<string, CacheEntry<any>>();
  private listeners = new Map<string, Unsubscribe>();
  private readonly DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes
  private readonly PAGINATION_SIZE = 20;

  // Optimized document read with caching
  async getDocument<T>(path: string, ttl: number = this.DEFAULT_TTL): Promise<T | null> {
    const cacheKey = `doc:${path}`;
    const cached = this.getCachedData<T>(cacheKey);
    
    if (cached) {
      console.log(`📦 Cache hit: ${path}`);
      return cached;
    }

    console.log(`🔍 Firestore read: ${path}`);
    const docRef = doc(db, path);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      const data = { id: docSnap.id, ...docSnap.data() } as T;
      this.setCachedData(cacheKey, data, ttl);
      return data;
    }
    
    return null;
  }

  // Optimized collection query with pagination and caching
  async getCollection<T>(
    collectionPath: string,
    constraints: any[] = [],
    options: {
      ttl?: number;
      pageSize?: number;
      cacheKey?: string;
      enablePagination?: boolean;
    } = {}
  ): Promise<{
    data: T[];
    pagination?: PaginationState;
  }> {
    const {
      ttl = this.DEFAULT_TTL,
      pageSize = this.PAGINATION_SIZE,
      cacheKey = `collection:${collectionPath}:${JSON.stringify(constraints)}`,
      enablePagination = true
    } = options;

    // Check cache first
    const cached = this.getCachedData<T[]>(cacheKey);
    if (cached) {
      console.log(`📦 Collection cache hit: ${collectionPath}`);
      return { data: cached };
    }

    console.log(`🔍 Firestore query: ${collectionPath}`);
    
    // Build query
    let q = query(collection(db, collectionPath), ...constraints);
    
    if (enablePagination) {
      q = query(q, limit(pageSize));
    }

    const querySnapshot = await getDocs(q);
    const data: T[] = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as T));

    // Cache the results
    this.setCachedData(cacheKey, data, ttl);

    const pagination: PaginationState = {
      lastVisible: querySnapshot.docs[querySnapshot.docs.length - 1] || null,
      hasMore: querySnapshot.docs.length === pageSize,
      loading: false
    };

    return { data, pagination: enablePagination ? pagination : undefined };
  }

  // Load next page
  async getNextPage<T>(
    collectionPath: string,
    constraints: any[],
    lastVisible: QueryDocumentSnapshot,
    pageSize: number = this.PAGINATION_SIZE
  ): Promise<{
    data: T[];
    pagination: PaginationState;
  }> {
    const q = query(
      collection(db, collectionPath),
      ...constraints,
      startAfter(lastVisible),
      limit(pageSize)
    );

    const querySnapshot = await getDocs(q);
    const data: T[] = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as T));

    const pagination: PaginationState = {
      lastVisible: querySnapshot.docs[querySnapshot.docs.length - 1] || null,
      hasMore: querySnapshot.docs.length === pageSize,
      loading: false
    };

    return { data, pagination };
  }

  // Optimized real-time listener with debouncing
  subscribeToDocument<T>(
    path: string,
    callback: (data: T | null) => void,
    options: {
      debounceMs?: number;
      ttl?: number;
    } = {}
  ): () => void {
    const { debounceMs = 1000, ttl = this.DEFAULT_TTL } = options;
    const cacheKey = `doc:${path}`;
    
    // Cancel existing listener
    this.unsubscribeListener(cacheKey);

    let debounceTimer: NodeJS.Timeout;
    
    const unsubscribe = onSnapshot(doc(db, path), (docSnap) => {
      clearTimeout(debounceTimer);
      
      debounceTimer = setTimeout(() => {
        if (docSnap.exists()) {
          const data = { id: docSnap.id, ...docSnap.data() } as T;
          this.setCachedData(cacheKey, data, ttl);
          callback(data);
        } else {
          this.invalidateCache(cacheKey);
          callback(null);
        }
      }, debounceMs);
    });

    this.listeners.set(cacheKey, unsubscribe);
    
    return () => {
      clearTimeout(debounceTimer);
      this.unsubscribeListener(cacheKey);
    };
  }

  // Batch write operations
  batchWrite(path: string, data: any, operation: 'set' | 'update' = 'update') {
    if (operation === 'set') {
      batchManager.set(path, data);
    } else {
      batchManager.update(path, data);
    }
    
    // Invalidate cache
    this.invalidateCache(`doc:${path}`);
  }

  // Force commit all pending operations
  async flushBatch(): Promise<void> {
    await batchManager.flush();
  }

  // Cache management
  private getCachedData<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.data;
  }

  private setCachedData<T>(key: string, data: T, ttl: number): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }

  private invalidateCache(key: string): void {
    this.cache.delete(key);
  }

  private unsubscribeListener(key: string): void {
    const unsubscribe = this.listeners.get(key);
    if (unsubscribe) {
      unsubscribe();
      this.listeners.delete(key);
    }
  }

  // Clear all cache
  clearCache(): void {
    this.cache.clear();
  }

  // Clear all listeners
  clearListeners(): void {
    this.listeners.forEach(unsubscribe => unsubscribe());
    this.listeners.clear();
  }

  // Get cache stats
  getCacheStats() {
    const stats = {
      totalEntries: this.cache.size,
      totalListeners: this.listeners.size,
      cacheKeys: Array.from(this.cache.keys()),
      listenerKeys: Array.from(this.listeners.keys())
    };
    
    console.table(stats);
    return stats;
  }
}

export const optimizedFirestore = new OptimizedFirestore();

// Cleanup on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    optimizedFirestore.clearListeners();
  });
}
