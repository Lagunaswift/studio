// src/lib/ai/AIRequestManager.ts
import { createHash } from 'crypto';
import LRUCache from 'lru-cache';

interface AIRequest {
  prompt: string;
  model: string;
  config?: any;
  userId?: string;
  context?: any;
}

interface CachedResponse {
  response: any;
  timestamp: number;
  tokensUsed: number;
  model: string;
}

interface AIUsageStats {
  totalRequests: number;
  cacheHits: number;
  totalTokensUsed: number;
  totalCost: number;
  avgResponseTime: number;
}

interface QueuedAIRequest extends AIRequest {
  _cacheKey: string;
  _cacheType: keyof AIRequestManager['CACHE_TTL'];
  _maxRetries: number;
  _resolve: (value: any) => void;
  _reject: (reason?: any) => void;
}

// 🔧 FIX: Export the class so it can be imported and instantiated
export class AIRequestManager {
  private cache: LRUCache<string, CachedResponse>;
  private requestQueue: QueuedAIRequest[] = [];
  private isProcessing = false;
  private stats: AIUsageStats = {
    totalRequests: 0,
    cacheHits: 0,
    totalTokensUsed: 0,
    totalCost: 0,
    avgResponseTime: 0
  };

  public readonly MODEL_PRICING = {
    'gemini-2.5-flash': { input: 0.00015, output: 0.0006 },
    'gemini-2.5-pro': { input: 0.0025, output: 0.01 },
    'claude-3-haiku': { input: 0.00025, output: 0.00125 },
    'gpt-4o-mini': { input: 0.00015, output: 0.0006 }
  };

  public readonly CACHE_TTL = {
    'meal-plan': 24 * 60 * 60 * 1000,
    'recipe-suggestion': 12 * 60 * 60 * 1000,
    'nutrition-analysis': 6 * 60 * 60 * 1000,
    'default': 1 * 60 * 60 * 1000
  };

  constructor() {
    this.cache = new LRUCache<string, CachedResponse>({
      max: 1000,
      ttl: this.CACHE_TTL.default,
      updateAgeOnGet: true,
    });

    // Only start the queue processor in browser environment
    if (typeof window !== 'undefined') {
      setInterval(this.processQueue.bind(this), 2000);
    }
  }

  async generateWithCache(
    request: AIRequest,
    options: {
      cacheType?: keyof typeof this.CACHE_TTL;
      priority?: 'high' | 'normal' | 'low';
      maxRetries?: number;
    } = {}
  ): Promise<any> {
    const { cacheType = 'default', priority = 'normal', maxRetries = 3 } = options;
    const cacheKey = this.generateCacheKey(request, cacheType);
    
    const cached = this.getCachedResponse(cacheKey);
    if (cached) {
      this.stats.cacheHits++;
      console.log(`🎯 AI Cache hit: ${cacheKey.substring(0, 20)}...`);
      return cached.response;
    }

    if (priority === 'high') {
      return this.processRequest(request, cacheKey, cacheType, maxRetries);
    } else {
      return this.queueRequest(request, cacheKey, cacheType, maxRetries);
    }
  }

  private async processRequest(
    request: AIRequest,
    cacheKey: string,
    cacheType: keyof typeof this.CACHE_TTL,
    maxRetries: number
  ): Promise<any> {
    const startTime = Date.now();
    let attempt = 0;

    while (attempt < maxRetries) {
      try {
        this.stats.totalRequests++;
        const optimizedRequest = this.optimizeRequest(request);
        const response = await this.callAI(optimizedRequest);
        
        const tokensUsed = this.estimateTokens(optimizedRequest.prompt) + this.estimateTokens(JSON.stringify(response));
        const cost = this.calculateCost(optimizedRequest.model, tokensUsed);
        
        this.stats.totalTokensUsed += tokensUsed;
        this.stats.totalCost += cost;
        this.stats.avgResponseTime = (this.stats.avgResponseTime + (Date.now() - startTime)) / 2;

        this.setCachedResponse(cacheKey, {
          response,
          timestamp: Date.now(),
          tokensUsed,
          model: optimizedRequest.model
        }, cacheType);

        console.log(`✅ AI Request completed: ${tokensUsed} tokens, $${cost.toFixed(4)}`);
        return response;
      } catch (error) {
        attempt++;
        console.error(`❌ AI Request failed (attempt ${attempt}):`, error);
        if (attempt >= maxRetries) throw error;
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
      }
    }
  }

  private queueRequest(
    request: AIRequest,
    cacheKey: string,
    cacheType: keyof typeof this.CACHE_TTL,
    maxRetries: number
  ): Promise<any> {
    return new Promise((resolve, reject) => {
      this.requestQueue.push({
        ...request,
        _cacheKey: cacheKey,
        _cacheType: cacheType,
        _maxRetries: maxRetries,
        _resolve: resolve,
        _reject: reject
      });
    });
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.requestQueue.length === 0) return;

    this.isProcessing = true;
    const batch = this.requestQueue.splice(0, 5);

    try {
      await Promise.allSettled(batch.map(req =>
        this.processRequest(req, req._cacheKey, req._cacheType, req._maxRetries)
          .then(req._resolve)
          .catch(req._reject)
      ));
    } finally {
      this.isProcessing = false;
    }
  }

  private optimizeRequest(request: AIRequest): AIRequest {
    let optimizedPrompt = request.prompt.replace(/\s+/g, ' ').replace(/\n\s*\n/g, '\n').trim();
    let optimizedModel = this.isSimpleTask(optimizedPrompt) ? 'gemini-2.5-flash' : request.model;
    const optimizedContext = request.context ? this.compressContext(request.context) : undefined;

    return {
      ...request,
      prompt: optimizedPrompt,
      model: optimizedModel,
      context: optimizedContext,
      config: {
        ...request.config,
        maxOutputTokens: Math.min(request.config?.maxOutputTokens || 1024, 1024),
        temperature: request.config?.temperature || 0.7
      }
    };
  }

  private isSimpleTask(prompt: string): boolean {
    const simpleKeywords = ['summarize', 'list', 'yes/no', 'true/false', 'short answer', 'quick', 'brief', 'simple', 'basic'];
    return simpleKeywords.some(keyword => prompt.toLowerCase().includes(keyword)) || prompt.length < 200;
  }

  private compressContext(context: any): any {
    if (!context) return context;
    const compressed = { ...context };
    delete compressed.created_at;
    delete compressed.updated_at;
    delete compressed.metadata;
    
    Object.keys(compressed).forEach(key => {
      if (typeof compressed[key] === 'string' && (compressed[key] as string).length > 500) {
        compressed[key] = (compressed[key] as string).substring(0, 500) + '...';
      }
    });

    return compressed;
  }

  private generateCacheKey(request: AIRequest, cacheType: string): string {
    const keyData = {
      prompt: request.prompt,
      model: request.model,
      config: request.config,
      context: request.context ? this.hashObject(request.context) : null,
      type: cacheType
    };
    return createHash('sha256').update(JSON.stringify(keyData)).digest('hex');
  }

  private getCachedResponse(cacheKey: string): CachedResponse | null {
    const entry = this.cache.get(cacheKey);
    return entry || null;
  }

  private setCachedResponse(
    cacheKey: string, 
    response: CachedResponse, 
    cacheType: keyof typeof this.CACHE_TTL
  ): void {
    const ttl = this.CACHE_TTL[cacheType];
    this.cache.set(cacheKey, response, { ttl });
  }

  private estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }

  private calculateCost(model: string, tokens: number): number {
    const pricing = this.MODEL_PRICING[model as keyof typeof this.MODEL_PRICING];
    if (!pricing) return 0;
    
    const inputTokens = Math.floor(tokens * 0.7);
    const outputTokens = Math.ceil(tokens * 0.3);
    
    return (inputTokens * pricing.input + outputTokens * pricing.output) / 1000;
  }

  private hashObject(obj: any): string {
    return createHash('sha256').update(JSON.stringify(obj)).digest('hex').substring(0, 16);
  }

  private async callAI(request: AIRequest): Promise<any> {
    // Client-side fallback response for development/testing
    // In production, this would route through API endpoints
    if (request.prompt.includes('meal plan') || request.prompt.includes('Generate a')) {
      return {
        meals: [
          {
            name: 'Simple Breakfast',
            type: 'breakfast',
            calories: 300,
            macros: { protein: 15, carbs: 40, fat: 12 },
            ingredients: ['oats', 'banana', 'almonds'],
            instructions: ['Cook oats', 'Add banana and almonds']
          }
        ],
        totalCalories: 300,
        totalMacros: { protein: 15, carbs: 40, fat: 12 }
      };
    }
    
    // Recipe suggestions fallback
    return {
      recipes: [
        {
          name: 'Pantry Special',
          description: 'Quick meal with available ingredients',
          difficulty: 'easy',
          cookingTime: 25,
          servings: 2,
          ingredients: request.context?.pantryItems?.slice(0, 3) || ['basic ingredients'],
          instructions: ['Prepare ingredients', 'Combine and cook'],
          nutrition: { calories: 350, protein: 20, carbs: 35, fat: 15 }
        }
      ]
    };
  }

  getStats(): AIUsageStats & { cacheHitRate: number } {
    const cacheHitRate = this.stats.totalRequests > 0 ? (this.stats.cacheHits / this.stats.totalRequests) * 100 : 0;
    return { ...this.stats, cacheHitRate };
  }

  clearCache(): void {
    this.cache.clear();
  }

  async preloadCache(commonRequests: AIRequest[]): Promise<void> {
    console.log(`🔄 Preloading ${commonRequests.length} common AI responses...`);
    for (const request of commonRequests) {
      try {
        await this.generateWithCache(request, { priority: 'low' });
      } catch (error) {
        console.warn('Failed to preload:', error);
      }
    }
    console.log('✅ Cache preloading completed');
  }
}

// 🔧 FIX: Keep the singleton export for backward compatibility
export const aiRequestManager = new AIRequestManager();

// Preload common requests in browser environment
if (typeof window !== 'undefined') {
  const commonRequests: AIRequest[] = [
    { prompt: 'Generate a healthy breakfast meal plan', model: 'gemini-2.5-flash' },
    { prompt: 'Suggest protein-rich dinner recipes', model: 'gemini-2.5-flash' },
    { prompt: 'Create a shopping list for meal prep', model: 'gemini-2.5-flash' }
  ];
  
  setTimeout(() => aiRequestManager.preloadCache(commonRequests), 5000);
}
