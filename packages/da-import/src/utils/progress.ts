export class ProgressTracker {
  private current = 0;
  private lastPrintedPct = -1;

  constructor(
    private readonly total: number,
    private readonly label: string
  ) {}

  increment(): void {
    this.current++;
    const pct = Math.floor((this.current / this.total) * 100);
    if (pct !== this.lastPrintedPct && pct % 5 === 0) {
      this.lastPrintedPct = pct;
      process.stdout.write(
        `\r  ${this.label}: ${this.current}/${this.total} (${pct}%)`
      );
    }
  }

  finish(): void {
    process.stdout.write(
      `\r  ${this.label}: ${this.current}/${this.total} (100%)\n`
    );
  }
}
