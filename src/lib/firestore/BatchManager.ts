import { 
  writeBatch, 
  doc, 
  collection, 
  DocumentReference, 
  Firestore,
  serverTimestamp,
  FieldValue 
} from 'firebase/firestore';
import { db } from '@/lib/firebase-client';

interface BatchOperation {
  type: 'set' | 'update' | 'delete';
  ref: DocumentReference;
  data?: any;
  options?: { merge?: boolean };
}

class FirestoreBatchManager {
  private operations: BatchOperation[] = [];
  private readonly MAX_BATCH_SIZE = 500; // Firestore limit
  private readonly AUTO_COMMIT_DELAY = 2000; // 2 seconds
  private commitTimer: NodeJS.Timeout | null = null;
  private isCommitting = false;

  // Add operation to batch
  addOperation(operation: BatchOperation) {
    this.operations.push(operation);
    
    // Auto-commit if batch is full
    if (this.operations.length >= this.MAX_BATCH_SIZE) {
      this.commitBatch();
      return;
    }

    // Schedule auto-commit
    this.scheduleAutoCommit();
  }

  // Set document
  set(path: string, data: any, options?: { merge?: boolean }) {
    const ref = doc(db, path);
    this.addOperation({
      type: 'set',
      ref,
      data: {
        ...data,
        updatedAt: serverTimestamp(),
        batchId: this.generateBatchId()
      },
      options
    });
  }

  // Update document
  update(path: string, data: any) {
    const ref = doc(db, path);
    this.addOperation({
      type: 'update',
      ref,
      data: {
        ...data,
        updatedAt: serverTimestamp(),
        batchId: this.generateBatchId()
      }
    });
  }

  // Delete document
  delete(path: string) {
    const ref = doc(db, path);
    this.addOperation({
      type: 'delete',
      ref
    });
  }

  // Manual commit
  async commitBatch(): Promise<void> {
    if (this.isCommitting || this.operations.length === 0) {
      return;
    }

    this.isCommitting = true;
    this.clearAutoCommitTimer();

    try {
      // Split into chunks if necessary
      const chunks = this.chunkOperations(this.operations, this.MAX_BATCH_SIZE);
      
      for (const chunk of chunks) {
        const batch = writeBatch(db);
        
        chunk.forEach(operation => {
          switch (operation.type) {
            case 'set':
              batch.set(operation.ref, operation.data, operation.options || {});
              break;
            case 'update':
              batch.update(operation.ref, operation.data);
              break;
            case 'delete':
              batch.delete(operation.ref);
              break;
          }
        });

        await batch.commit();
      }

      console.log(`✅ Committed ${this.operations.length} operations in ${chunks.length} batches`);
      this.operations = [];
    } catch (error) {
      console.error('❌ Batch commit failed:', error);
      throw error;
    } finally {
      this.isCommitting = false;
    }
  }

  private scheduleAutoCommit() {
    this.clearAutoCommitTimer();
    this.commitTimer = setTimeout(() => {
      this.commitBatch();
    }, this.AUTO_COMMIT_DELAY);
  }

  private clearAutoCommitTimer() {
    if (this.commitTimer) {
      clearTimeout(this.commitTimer);
      this.commitTimer = null;
    }
  }

  private chunkOperations(operations: BatchOperation[], size: number): BatchOperation[][] {
    const chunks: BatchOperation[][] = [];
    for (let i = 0; i < operations.length; i += size) {
      chunks.push(operations.slice(i, i + size));
    }
    return chunks;
  }

  private generateBatchId(): string {
    return `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Force immediate commit
  async flush(): Promise<void> {
    await this.commitBatch();
  }

  // Get pending operations count
  getPendingCount(): number {
    return this.operations.length;
  }
}

export const batchManager = new FirestoreBatchManager();

// Auto-flush on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    batchManager.flush();
  });
}
