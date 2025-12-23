const { calculateRateLimitWait, clamp } = require('./mathUtils');

/**
 * Rate Limiter with mathematically rigorous timing guarantees
 * 
 * Invariants:
 *   1. At most `maxRequests` requests occur within any `interval` window
 *   2. Wait times are always positive (≥ MIN_WAIT_MS)
 *   3. No infinite recursion possible (bounded recursion depth)
 * 
 * @class RateLimiter
 */
class RateLimiter {
  /**
   * Minimum wait time to prevent tight loops (ms)
   * @static
   */
  static MIN_WAIT_MS = 100;

  /**
   * Maximum recursion depth for rate limit checks
   * @static
   */
  static MAX_RECURSION_DEPTH = 10;

  /**
   * Create a new rate limiter
   * 
   * @param {Object} options - Configuration options
   * @param {number} [options.maxRequests=10] - Maximum requests per interval
   * @param {number} [options.interval=60000] - Time window in milliseconds
   */
  constructor(options = {}) {
    this.maxRequests = Math.max(1, options.maxRequests || 10);
    this.interval = Math.max(1000, options.interval || 60000); // Minimum 1 second
    this.requests = [];
    this._recursionDepth = 0;
  }

  /**
   * Check and wait for rate limit compliance
   * 
   * Algorithm:
   *   1. Prune expired timestamps from sliding window
   *   2. If under limit, record request and return immediately
   *   3. If at limit, calculate wait time with positive guarantee
   *   4. Wait and retry with bounded recursion
   * 
   * Complexity: O(n) where n = maxRequests
   * 
   * @returns {Promise<void>} - Resolves when request can proceed
   * @throws {Error} - If max recursion depth exceeded (safety mechanism)
   */
  async checkLimit() {
    // Safety check for infinite recursion
    if (this._recursionDepth >= RateLimiter.MAX_RECURSION_DEPTH) {
      this._recursionDepth = 0;
      throw new Error(
        `Rate limiter exceeded max recursion depth (${RateLimiter.MAX_RECURSION_DEPTH}). ` +
        `This indicates a timing anomaly.`
      );
    }

    const now = Date.now();

    // Prune timestamps outside the sliding window
    // Invariant: After filtering, all timestamps satisfy (now - ts) < interval
    this.requests = this.requests.filter(timestamp => now - timestamp < this.interval);

    // Check if we're under the limit
    if (this.requests.length < this.maxRequests) {
      this.requests.push(now);
      this._recursionDepth = 0; // Reset on successful request
      return;
    }

    // Calculate wait time with positive guarantee
    // The oldest request determines when a slot opens
    const oldestRequest = this.requests[0];
    const elapsed = now - oldestRequest;

    // Use mathematically safe wait calculation
    const waitTime = calculateRateLimitWait(
      this.interval,
      elapsed,
      RateLimiter.MIN_WAIT_MS
    );

    console.log(
      `[RateLimiter] Rate limit reached (${this.requests.length}/${this.maxRequests}). ` +
      `Waiting ${Math.ceil(waitTime / 1000)}s...`
    );

    // Wait for the calculated time
    await new Promise(resolve => setTimeout(resolve, waitTime));

    // Increment recursion depth and retry
    this._recursionDepth++;
    return this.checkLimit();
  }

  /**
   * Get current rate limiter status
   * 
   * @returns {Object} - Current status
   */
  getStatus() {
    const now = Date.now();
    const activeRequests = this.requests.filter(ts => now - ts < this.interval).length;

    return {
      activeRequests,
      maxRequests: this.maxRequests,
      interval: this.interval,
      availableSlots: Math.max(0, this.maxRequests - activeRequests),
      isLimited: activeRequests >= this.maxRequests
    };
  }

  /**
   * Reset the rate limiter state
   */
  reset() {
    this.requests = [];
    this._recursionDepth = 0;
  }

  /**
   * Calculate time until next available slot
   * 
   * @returns {number} - Milliseconds until next slot (0 if available now)
   */
  getTimeUntilAvailable() {
    const now = Date.now();
    this.requests = this.requests.filter(ts => now - ts < this.interval);

    if (this.requests.length < this.maxRequests) {
      return 0;
    }

    const oldestRequest = this.requests[0];
    const elapsed = now - oldestRequest;

    return Math.max(0, this.interval - elapsed);
  }
}

module.exports = RateLimiter;