/**
 * Simple LRU (Least Recently Used) cache implementation
 * Uses Map to maintain insertion order
 */
export class LRUCache<K, V> {

  private cache: Map<K, V>;
  private readonly maxSize: number;

  constructor(maxSize: number = 1000) {

    this.cache = new Map();
    this.maxSize = maxSize;
  }

  /**
   * Get value from cache
   * Moves accessed item to end (most recently used)
   */
  get(key: K): V | undefined {

    const value = this.cache.get(key);

    if (value !== undefined) {

      // Move to end (most recently used)
      this.cache.delete(key);
      this.cache.set(key, value);
    }

    return value;
  }

  /**
   * Set value in cache
   * Evicts least recently used item if cache is full
   */
  set(key: K, value: V): void {

    // Remove if already exists (to update position)
    if (this.cache.has(key)) {

      this.cache.delete(key);
    }

    // Evict oldest if at capacity
    if (this.cache.size >= this.maxSize) {

      const firstKey = this.cache.keys().next().value;

      if (firstKey !== undefined) {

        this.cache.delete(firstKey);
      }
    }

    this.cache.set(key, value);
  }

  /**
   * Check if key exists in cache
   */
  has(key: K): boolean {

    return this.cache.get(key) !== undefined;
  }

  /**
   * Delete key from cache
   */
  delete(key: K): boolean {

    return this.cache.delete(key);
  }

  /**
   * Clear entire cache
   */
  clear(): void {

    this.cache.clear();
  }

  /**
   * Get current cache size
   */
  get size(): number {

    return this.cache.size;
  }
}
