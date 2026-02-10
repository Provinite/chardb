export class RateLimiter {
  private lastCall = 0;

  constructor(private readonly intervalMs: number = 1000) {}

  async wait(): Promise<void> {
    const now = Date.now();
    const elapsed = now - this.lastCall;
    if (elapsed < this.intervalMs) {
      await new Promise((r) => setTimeout(r, this.intervalMs - elapsed));
    }
    this.lastCall = Date.now();
  }
}
