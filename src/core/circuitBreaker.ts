/**
 * core/circuitBreaker.ts — Fault tolerance for external dependencies.
 * 
 * Implements a basic state machine to protect the system from cascading failures.
 * Rules:
 * - 3 failures -> OPEN (30s timeout)
 * - After timeout -> HALF_OPEN
 * - 1 success -> CLOSED
 */

type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export class CircuitBreaker {
  private state: CircuitState = 'CLOSED';
  private failureCount: number = 0;
  private lastFailureTime: number | null = null;
  private readonly threshold: number = 3;
  private readonly resetTimeoutMs: number = 30000; // 30 seconds

  /**
   * Records a failure.
   * If threshold is met, the circuit opens.
   */
  public recordFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.failureCount >= this.threshold) {
      this.state = 'OPEN';
    }
  }

  /**
   * Records a success.
   * Resets the failure counter and closes the circuit.
   */
  public recordSuccess(): void {
    this.failureCount = 0;
    this.lastFailureTime = null;
    this.state = 'CLOSED';
  }

  /**
   * Determines if a request should be allowed.
   * If OPEN and timeout passed, transitions to HALF_OPEN.
   */
  public shouldAllowRequest(): boolean {
    if (this.state === 'OPEN') {
      const now = Date.now();
      if (this.lastFailureTime && now - this.lastFailureTime > this.resetTimeoutMs) {
        this.state = 'HALF_OPEN';
        return true;
      }
      return false;
    }
    
    // CLOSED and HALF_OPEN allow requests
    return true;
  }

  /**
   * Returns current state for monitoring.
   */
  public getState(): CircuitState {
    return this.state;
  }
}
