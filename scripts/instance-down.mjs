#!/usr/bin/env node
/**
 * Stops everything this checkout is running: its dev servers and its
 * containers.
 *
 *   yarn instance:down
 *   yarn instance:down --volumes    # also drop this instance's database
 *
 * `yarn infra:down` only ever handled the containers. The dev servers are the
 * half that actually leaks, because `yarn dev` survives the death of whatever
 * started it -- an agent that is killed rather than interrupted leaves a nest
 * and a vite holding the slot's ports indefinitely.
 *
 * Slot 0 is not special here. This only ever touches ports and a compose
 * project derived from the checkout you run it in.
 */
import { execFileSync } from "node:child_process";
import { resolveInstance } from "./instance.mjs";
import { findInstanceServers, stopProcesses } from "./lib/processes.mjs";

function main() {
  const instance = resolveInstance();
  const { ports, names, root } = instance;

  // Postgres and LocalStack are containers; compose stops those below.
  const serverPorts = [
    ports.frontend,
    ports.backend,
    ports.e2eBackend,
    ports.e2eFrontend,
  ];

  const servers = findInstanceServers(serverPorts, root);
  if (servers.length === 0) {
    console.log("No dev servers running for this checkout.");
  } else {
    for (const { port, pid } of servers) {
      console.log(`stopping  pid ${pid}  (port ${port})`);
    }
    stopProcesses(servers);
    const survivors = findInstanceServers(serverPorts, root);
    if (survivors.length > 0) {
      console.error(
        `Could not stop: ${survivors.map((s) => s.pid).join(", ")}. ` +
          `Check them by hand -- they may not be ours.`,
      );
    }
  }

  // Addressed by project name, with no -f files. Compose then works from the
  // containers' own labels, which is the only way to catch everything the
  // project ever created: the e2e suite's postgres-test lives in
  // compose.test.yml, so passing the dev compose files left it running after
  // every `instance:down`.
  const args = ["compose", "-p", names.composeProject, "down"];
  if (process.argv.includes("--volumes")) args.push("-v");

  console.log(`\nstopping compose project ${names.composeProject}`);
  try {
    execFileSync("docker", args, {
      cwd: root,
      stdio: "inherit",
      env: { ...process.env, COMPOSE_PROJECT_NAME: names.composeProject },
    });
  } catch {
    console.error(
      "docker compose down failed (is the daemon running?). " +
        "The dev servers above were still stopped.",
    );
    process.exitCode = 1;
  }
}

main();
