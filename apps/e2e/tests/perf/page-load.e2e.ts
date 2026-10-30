import * as fs from "node:fs";
import * as path from "node:path";
import type { Page } from "@playwright/test";
import { presetTest } from "../../src/fixtures.js";
import { REPO_ROOT, apexUrl } from "../../src/config.js";

/**
 * Page-load measurements on a throttled phone, for comparing before and after
 * a change (#427 holds the baseline). Opt-in: skipped unless E2E_PERF=1.
 *
 *   E2E_PERF=1 yarn workspace @chardb/e2e e2e tests/perf/page-load.e2e.ts
 *
 * Lab numbers from one machine: compare runs of this spec with each other, not
 * with field data. Results print and are written to .tmp/perf-page-load.json.
 */

const test = presetTest("community-basic");
test.skip(!process.env.E2E_PERF, "Set E2E_PERF=1 to measure page loads");
test.setTimeout(600_000);

const RUNS = 3;
const PHONE = { width: 412, height: 823 };

/** Lighthouse's mobile profile: slow 4G and a 4x CPU slowdown. */
const THROTTLE = {
  latency: 150,
  downloadThroughput: (1638.4 * 1024) / 8,
  uploadThroughput: (750 * 1024) / 8,
  cpuRate: 4,
};

interface Sample {
  fcp: number | null;
  lcp: number | null;
  cls: number;
  tbt: number;
  domContentLoaded: number;
  load: number;
  jsBytes: number;
  cssBytes: number;
  imgBytes: number;
  requests: number;
}

interface PerfWindow extends Window {
  __perf: { lcp: number | null; cls: number; tbt: number };
}

interface LayoutShift extends PerformanceEntry {
  value: number;
  hadRecentInput: boolean;
}

const measure = async (page: Page, url: string): Promise<Sample> => {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Network.enable");
  await cdp.send("Network.setCacheDisabled", { cacheDisabled: true });
  await cdp.send("Network.emulateNetworkConditions", {
    offline: false,
    latency: THROTTLE.latency,
    downloadThroughput: THROTTLE.downloadThroughput,
    uploadThroughput: THROTTLE.uploadThroughput,
  });
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: THROTTLE.cpuRate });

  await page.addInitScript(() => {
    const w = window as unknown as PerfWindow;
    w.__perf = { lcp: null, cls: 0, tbt: 0 };
    new PerformanceObserver((list) => {
      for (const e of list.getEntries()) w.__perf.lcp = e.startTime;
    }).observe({ type: "largest-contentful-paint", buffered: true });
    new PerformanceObserver((list) => {
      for (const e of list.getEntries() as LayoutShift[]) {
        if (!e.hadRecentInput) w.__perf.cls += e.value;
      }
    }).observe({ type: "layout-shift", buffered: true });
    // Approximates Lighthouse's TBT: every long task's time past 50ms.
    new PerformanceObserver((list) => {
      for (const e of list.getEntries())
        w.__perf.tbt += Math.max(0, e.duration - 50);
    }).observe({ type: "longtask", buffered: true });
  });

  await page.goto(url, { waitUntil: "networkidle", timeout: 300_000 });
  // LCP can still move after the network settles.
  await page.waitForTimeout(3000);

  const sample = await page.evaluate((): Sample => {
    const { __perf } = window as unknown as PerfWindow;
    const nav = performance.getEntriesByType(
      "navigation",
    )[0] as PerformanceNavigationTiming;
    const resources = performance.getEntriesByType(
      "resource",
    ) as PerformanceResourceTiming[];
    const bytes = (match: (r: PerformanceResourceTiming) => boolean) =>
      resources.filter(match).reduce((sum, r) => sum + r.transferSize, 0);
    return {
      fcp:
        performance.getEntriesByName("first-contentful-paint")[0]?.startTime ??
        null,
      lcp: __perf.lcp,
      cls: __perf.cls,
      tbt: __perf.tbt,
      domContentLoaded: nav.domContentLoadedEventEnd,
      load: nav.loadEventEnd,
      jsBytes: bytes(
        (r) => r.initiatorType === "script" || /\.js(\?|$)/.test(r.name),
      ),
      cssBytes: bytes((r) => /\.css(\?|$)/.test(r.name)),
      imgBytes: bytes((r) => r.initiatorType === "img"),
      requests: resources.length,
    };
  });
  await cdp.detach();
  return sample;
};

const median = (values: number[]): number =>
  [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];

test("page loads on a throttled phone", async ({ browser, world }) => {
  const pages: Record<string, string> = {
    "apex home": apexUrl("/"),
    "browse characters": apexUrl("/characters"),
    "community home": world.community.url,
    "character page": world.characters.plain.url,
  };

  const results: Record<string, Record<keyof Sample, number | null>> = {};
  for (const [name, url] of Object.entries(pages)) {
    const samples: Sample[] = [];
    for (let i = 0; i < RUNS; i++) {
      const context = await browser.newContext({
        viewport: PHONE,
        isMobile: true,
        hasTouch: true,
      });
      samples.push(await measure(await context.newPage(), url));
      await context.close();
    }
    const keys = Object.keys(samples[0]) as (keyof Sample)[];
    results[name] = Object.fromEntries(
      keys.map((key) => {
        const values = samples
          .map((s) => s[key])
          .filter((v): v is number => v !== null);
        return [key, values.length ? Math.round(median(values)) : null];
      }),
    ) as Record<keyof Sample, number | null>;
    console.log(name, JSON.stringify(results[name]));
  }

  const out = path.resolve(REPO_ROOT, ".tmp/perf-page-load.json");
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, JSON.stringify(results, null, 2));
});
