export class RateLimiter {
  private lastCall = 0;

  constructor(
    private readonly minIntervalMs: number = 2000,
    private readonly maxIntervalMs: number = 3000
  ) {}

  async wait(): Promise<void> {
    const interval =
      this.minIntervalMs +
      Math.random() * (this.maxIntervalMs - this.minIntervalMs);
    const now = Date.now();
    const elapsed = now - this.lastCall;
    if (elapsed < interval) {
      await new Promise((r) => setTimeout(r, interval - elapsed));
    }
    this.lastCall = Date.now();
  }
}
