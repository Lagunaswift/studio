// Client-side encryption for sensitive data before Firebase storage
class ClientEncryption {
  private readonly ALGORITHM = 'AES-GCM';
  private readonly KEY_LENGTH = 256;
  private encryptionKey: CryptoKey | null = null;

  // Initialize or retrieve encryption key
  async initializeKey(userId: string): Promise<void> {
    try {
      // Try to get existing key from secure storage
      const storedKey = localStorage.getItem(`enc_key_${userId}`);
      
      if (storedKey) {
        // Import existing key
        const keyData = this.base64ToArrayBuffer(storedKey);
        this.encryptionKey = await crypto.subtle.importKey(
          'raw',
          keyData,
          { name: this.ALGORITHM },
          false, // Not extractable for security
          ['encrypt', 'decrypt']
        );
      } else {
        // Generate new key
        this.encryptionKey = await crypto.subtle.generateKey(
          {
            name: this.ALGORITHM,
            length: this.KEY_LENGTH,
          },
          true, // Extractable for storage
          ['encrypt', 'decrypt']
        );

        // Store key securely
        const keyData = await crypto.subtle.exportKey('raw', this.encryptionKey);
        localStorage.setItem(`enc_key_${userId}`, this.arrayBufferToBase64(keyData));
      }
    } catch (error) {
      console.error('Encryption key initialization failed:', error);
      throw new Error('Failed to initialize encryption');
    }
  }

  // Encrypt sensitive data before storing
  async encryptData(data: any): Promise<string> {
    if (!this.encryptionKey) {
      throw new Error('Encryption key not initialized');
    }

    try {
      const jsonString = JSON.stringify(data);
      const encodedData = new TextEncoder().encode(jsonString);
      
      // Generate random IV for each encryption
      const iv = crypto.getRandomValues(new Uint8Array(12));
      
      const encryptedData = await crypto.subtle.encrypt(
        {
          name: this.ALGORITHM,
          iv: iv,
        },
        this.encryptionKey,
        encodedData
      );

      // Combine IV and encrypted data
      const combined = new Uint8Array(iv.length + encryptedData.byteLength);
      combined.set(iv);
      combined.set(new Uint8Array(encryptedData), iv.length);

      return this.arrayBufferToBase64(combined);
    } catch (error) {
      console.error('Data encryption failed:', error);
      throw new Error('Failed to encrypt data');
    }
  }

  // Decrypt data after retrieving
  async decryptData<T>(encryptedData: string): Promise<T> {
    if (!this.encryptionKey) {
      throw new Error('Encryption key not initialized');
    }

    try {
      const combined = this.base64ToArrayBuffer(encryptedData);
      
      // Extract IV and encrypted data
      const iv = combined.slice(0, 12);
      const encrypted = combined.slice(12);

      const decryptedData = await crypto.subtle.decrypt(
        {
          name: this.ALGORITHM,
          iv: iv,
        },
        this.encryptionKey,
        encrypted
      );

      const jsonString = new TextDecoder().decode(decryptedData);
      return JSON.parse(jsonString);
    } catch (error) {
      console.error('Data decryption failed:', error);
      throw new Error('Failed to decrypt data');
    }
  }

  // Utility functions
  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  private base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }

  private parseJWTPayload(token: string): { exp: number; iat: number; uid: string } {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) {
        throw new Error('Invalid token format');
      }
      return JSON.parse(atob(parts[1]));
    } catch (error) {
      console.error('Failed to parse JWT payload:', error);
      return { 
        exp: Math.floor(Date.now() / 1000) + 3600,
        iat: Math.floor(Date.now() / 1000),
        uid: 'unknown'
      };
    }
  }

  // Clear encryption key (on logout)
  clearKey(userId: string): void {
    this.encryptionKey = null;
    localStorage.removeItem(`enc_key_${userId}`);
  }
}

// Enhanced profile data with encryption wrapper
export class SecureDataManager {
  private encryption = new ClientEncryption();
  private userId: string | null = null;

  async initialize(userId: string): Promise<void> {
    this.userId = userId;
    await this.encryption.initializeKey(userId);
  }

  // Encrypt sensitive profile data before storage
  async encryptProfile(profile: any): Promise<any> {
    if (!profile) return profile;

    const sensitiveFields = [
      'email', 'name', 'weightKg', 'heightCm', 'age',
      'bodyFatPercentage', 'dailyWeightLog', 'dailyVitalsLog'
    ];

    const encryptedProfile = { ...profile };

    for (const field of sensitiveFields) {
      if (profile[field] !== null && profile[field] !== undefined) {
        try {
          encryptedProfile[`${field}_encrypted`] = await this.encryption.encryptData(profile[field]);
          delete encryptedProfile[field]; // Remove plaintext
        } catch (error) {
          console.warn(`Failed to encrypt field ${field}:`, error);
          // Keep plaintext if encryption fails (graceful degradation)
        }
      }
    }

    return encryptedProfile;
  }

  // Decrypt profile data after retrieval
  async decryptProfile<T>(encryptedProfile: any): Promise<T> {
    if (!encryptedProfile) return encryptedProfile;

    const decryptedProfile = { ...encryptedProfile };

    // Find encrypted fields and decrypt them
    for (const key in encryptedProfile) {
      if (key.endsWith('_encrypted')) {
        const originalField = key.replace('_encrypted', '');
        try {
          decryptedProfile[originalField] = await this.encryption.decryptData(encryptedProfile[key]);
          delete decryptedProfile[key]; // Remove encrypted version
        } catch (error) {
          console.warn(`Failed to decrypt field ${originalField}:`, error);
          // Field remains encrypted if decryption fails
        }
      }
    }

    return decryptedProfile;
  }

  cleanup(): void {
    if (this.userId) {
      this.encryption.clearKey(this.userId);
      this.userId = null;
    }
  }
}

export const clientEncryption = new ClientEncryption();
export const secureDataManager = new SecureDataManager();