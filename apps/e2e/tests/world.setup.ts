import { test as setup, expect } from "@playwright/test";
import { CFG } from "../src/config.js";

setup("servers are reachable", async ({ request }) => {
  setup.setTimeout(120_000);

  const health = await request.get(`${CFG.backendUrl}/health`);
  expect(health.ok()).toBeTruthy();
  expect((await health.json()).status).toBe("ok");

  const app = await request.get(CFG.frontendUrl);
  expect(app.ok()).toBeTruthy();
  expect(await app.text()).toContain("<div id=\"root\">");
});
