/**
 * Performance Optimizer
 * Handles memory-efficient export processing and browser compatibility
 */

export class PerformanceOptimizer {
  private static readonly CHUNK_SIZE = 1000; // Process data in chunks
  private static readonly MAX_MEMORY_USAGE = 50 * 1024 * 1024; // 50MB limit
  private static readonly BROWSER_LIMITS = {
    maxBlobSize: 500 * 1024 * 1024, // 500MB
    maxStringLength: 500 * 1024 * 1024, // 500MB
    maxArrayLength: 100000,
  };

  /**
   * Check if browser supports required features
   */
  static checkBrowserCompatibility(): {
    isSupported: boolean;
    missingFeatures: string[];
    warnings: string[];
  } {
    const missingFeatures: string[] = [];
    const warnings: string[] = [];

    // Check for Blob support
    if (typeof Blob === 'undefined') {
      missingFeatures.push('Blob API');
    }

    // Check for URL.createObjectURL support
    if (typeof URL === 'undefined' || typeof URL.createObjectURL !== 'function') {
      missingFeatures.push('URL.createObjectURL');
    }

    // Check for download attribute support
    const testLink = document.createElement('a');
    if (typeof testLink.download === 'undefined') {
      warnings.push('Download attribute not supported - files may open in new tab');
    }

    // Check for File API support
    if (typeof File === 'undefined' || typeof FileReader === 'undefined') {
      warnings.push('File API not fully supported');
    }

    // Check memory limitations
    if (this.getAvailableMemory() < this.MAX_MEMORY_USAGE) {
      warnings.push('Limited memory available - large exports may fail');
    }

    return {
      isSupported: missingFeatures.length === 0,
      missingFeatures,
      warnings,
    };
  }

  /**
   * Estimate memory usage for export data
   */
  static estimateMemoryUsage(data: any): number {
    try {
      // Rough estimation based on JSON string length
      const jsonString = JSON.stringify(data);
      return jsonString.length * 2; // Account for Unicode and processing overhead
    } catch {
      // Fallback estimation
      return this.estimateObjectSize(data);
    }
  }

  /**
   * Process large datasets in chunks to avoid memory issues
   */
  static async processInChunks<T, R>(
    items: T[],
    processor: (chunk: T[]) => Promise<R[]>,
    chunkSize: number = this.CHUNK_SIZE
  ): Promise<R[]> {
    const results: R[] = [];

    for (let i = 0; i < items.length; i += chunkSize) {
      const chunk = items.slice(i, i + chunkSize);
      const chunkResults = await processor(chunk);
      results.push(...chunkResults);

      // Allow browser to breathe between chunks
      await this.yieldToEventLoop();

      // Check memory usage
      if (this.isMemoryPressureHigh()) {
        await this.requestGarbageCollection();
      }
    }

    return results;
  }

  /**
   * Optimize blob creation for large files
   */
  static createOptimizedBlob(data: string | ArrayBuffer, mimeType: string): Blob {
    try {
      // Check if data exceeds browser limits
      const dataSize = typeof data === 'string' ? data.length : data.byteLength;

      if (dataSize > this.BROWSER_LIMITS.maxBlobSize) {
        throw new Error(
          `Data size (${Math.round(dataSize / 1024 / 1024)}MB) exceeds browser limit`
        );
      }

      // Create blob with appropriate options
      const blobOptions: BlobPropertyBag = {
        type: mimeType,
      };

      // For large text data, use array to avoid string concatenation issues
      if (typeof data === 'string' && data.length > 1024 * 1024) {
        return new Blob([data], blobOptions);
      }

      return new Blob([data], blobOptions);
    } catch (error) {
      throw new Error(
        `Failed to create blob: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Optimize download for different browsers
   */
  static async optimizedDownload(blob: Blob, filename: string): Promise<void> {
    try {
      // Check blob size
      if (blob.size > this.BROWSER_LIMITS.maxBlobSize) {
        throw new Error('File too large for browser download');
      }

      // Use different strategies based on browser capabilities
      if (this.supportsDownloadAttribute()) {
        await this.downloadWithLink(blob, filename);
      } else if (this.supportsWindowOpen()) {
        await this.downloadWithWindow(blob, filename);
      } else {
        throw new Error('Browser does not support file downloads');
      }
    } catch (error) {
      throw new Error(
        `Download failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Monitor memory usage during export
   */
  static monitorMemoryUsage(): {
    used: number;
    available: number;
    percentage: number;
    isHigh: boolean;
  } {
    const used = this.getUsedMemory();
    const available = this.getAvailableMemory();
    const percentage = available > 0 ? (used / available) * 100 : 100;

    return {
      used,
      available,
      percentage,
      isHigh: percentage > 80,
    };
  }

  /**
   * Optimize string operations for large content
   */
  static optimizeStringOperations(content: string): string {
    // For very large strings, use more efficient operations
    if (content.length > 1024 * 1024) {
      // Use array join instead of string concatenation
      const lines = content.split('\n');
      return lines.join('\n');
    }

    return content;
  }

  /**
   * Create progressive export for very large datasets
   */
  static async createProgressiveExport<T>(
    data: T[],
    formatter: (item: T) => string,
    onProgress?: (progress: number) => void
  ): Promise<string> {
    const chunks: string[] = [];
    const chunkSize = Math.min(this.CHUNK_SIZE, Math.ceil(data.length / 100));

    for (let i = 0; i < data.length; i += chunkSize) {
      const chunk = data.slice(i, i + chunkSize);
      const formattedChunk = chunk.map(formatter).join('\n');
      chunks.push(formattedChunk);

      // Report progress
      if (onProgress) {
        const progress = Math.round(((i + chunkSize) / data.length) * 100);
        onProgress(Math.min(progress, 100));
      }

      // Yield to event loop
      await this.yieldToEventLoop();

      // Check memory pressure
      if (this.isMemoryPressureHigh()) {
        await this.requestGarbageCollection();
      }
    }

    return chunks.join('\n');
  }

  /**
   * Get browser-specific optimizations
   */
  static getBrowserOptimizations(): {
    browser: string;
    optimizations: string[];
  } {
    const userAgent = navigator.userAgent.toLowerCase();
    const optimizations: string[] = [];
    let browser = 'unknown';

    if (userAgent.includes('chrome')) {
      browser = 'chrome';
      optimizations.push('Use streaming for large files');
      optimizations.push('Enable memory pressure monitoring');
    } else if (userAgent.includes('firefox')) {
      browser = 'firefox';
      optimizations.push('Use smaller chunk sizes');
      optimizations.push('Avoid large string concatenations');
    } else if (userAgent.includes('safari')) {
      browser = 'safari';
      optimizations.push('Use conservative memory limits');
      optimizations.push('Implement fallback download methods');
    } else if (userAgent.includes('edge')) {
      browser = 'edge';
      optimizations.push('Use modern blob handling');
      optimizations.push('Enable progressive loading');
    }

    return { browser, optimizations };
  }

  // Private helper methods

  private static getAvailableMemory(): number {
    // Use performance.memory if available (Chrome)
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      return memory.jsHeapSizeLimit - memory.usedJSHeapSize;
    }

    // Fallback estimation
    return 100 * 1024 * 1024; // Assume 100MB available
  }

  private static getUsedMemory(): number {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      return memory.usedJSHeapSize;
    }

    return 0;
  }

  private static isMemoryPressureHigh(): boolean {
    const usage = this.monitorMemoryUsage();
    return usage.isHigh;
  }

  private static async requestGarbageCollection(): Promise<void> {
    // Force garbage collection if available (development only)
    if ('gc' in window && typeof (window as any).gc === 'function') {
      (window as any).gc();
    }

    // Yield to allow cleanup
    await this.yieldToEventLoop();
  }

  private static async yieldToEventLoop(): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, 0));
  }

  private static estimateObjectSize(obj: any): number {
    let size = 0;

    try {
      const stack = [obj];
      const visited = new WeakSet();

      while (stack.length > 0) {
        const current = stack.pop();

        if (visited.has(current)) {
          continue;
        }
        visited.add(current);

        if (typeof current === 'string') {
          size += current.length * 2; // Unicode
        } else if (typeof current === 'number') {
          size += 8;
        } else if (typeof current === 'boolean') {
          size += 4;
        } else if (current && typeof current === 'object') {
          for (const key in current) {
            if (Object.prototype.hasOwnProperty.call(current, key)) {
              size += key.length * 2;
              stack.push(current[key]);
            }
          }
        }
      }
    } catch {
      // Fallback for circular references
      size = 1024 * 1024; // 1MB estimate
    }

    return size;
  }

  private static supportsDownloadAttribute(): boolean {
    const testLink = document.createElement('a');
    return typeof testLink.download !== 'undefined';
  }

  private static supportsWindowOpen(): boolean {
    return typeof window.open === 'function';
  }

  private static async downloadWithLink(blob: Blob, filename: string): Promise<void> {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = url;
    link.download = filename;
    link.style.display = 'none';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Clean up URL after a delay to ensure download starts
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  private static async downloadWithWindow(blob: Blob, _filename: string): Promise<void> {
    const url = URL.createObjectURL(blob);
    const newWindow = window.open(url, '_blank');

    if (!newWindow) {
      URL.revokeObjectURL(url);
      throw new Error('Pop-up blocked - please allow pop-ups for this site');
    }

    // Clean up URL after a delay
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  }
}
