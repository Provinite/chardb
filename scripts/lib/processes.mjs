/**
 * Finding and stopping the host processes an instance leaves behind.
 *
 * Containers are easy: compose owns them and `down` removes them. The dev
 * servers are not. `yarn dev` is a node process tree, and when an agent is
 * killed rather than interrupted, nothing runs its cleanup -- the servers keep
 * the slot's ports and burn memory until someone notices.
 *
 * There is no bookkeeping here on purpose: an instance's ports are already
 * derived from its slot, so the ports themselves are the index. A pidfile would
 * be a second source of truth that goes stale exactly when it matters (a
 * SIGKILLed process cannot delete its own pidfile).
 */
import { execFileSync } from "node:child_process";
import * as fs from "node:fs";

function sleepSync(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

const run = (cmd, args) => {
  try {
    return execFileSync(cmd, args, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
  } catch {
    return null;
  }
};

/**
 * pid -> the listening TCP ports it holds, for every listener on this machine
 * that we can see.
 *
 * `ss` is the modern tool and is what WSL2 and every current distro ship;
 * `lsof` is the fallback. Both only report the pid for processes owned by the
 * current user, which is the right scope: an instance's servers are ours.
 */
function listeners() {
  const found = [];

  const ss = run("ss", ["-ltnpH"]);
  if (ss !== null) {
    for (const line of ss.split("\n")) {
      // ... 127.0.0.1:21000 0.0.0.0:* users:(("node",pid=25709,fd=29))
      const port = /:(\d+)\s+\S+\s+users:/.exec(line);
      const pid = /pid=(\d+)/.exec(line);
      if (port && pid)
        found.push({ port: Number(port[1]), pid: Number(pid[1]) });
    }
    return found;
  }

  const lsof = run("lsof", ["-nP", "-iTCP", "-sTCP:LISTEN", "-F", "pn"]);
  if (lsof === null) return found;
  let pid = null;
  for (const line of lsof.split("\n")) {
    if (line.startsWith("p")) pid = Number(line.slice(1));
    else if (line.startsWith("n") && pid !== null) {
      const port = /:(\d+)$/.exec(line);
      if (port) found.push({ port: Number(port[1]), pid });
    }
  }
  return found;
}

/** The working directory a pid was started in, or null if we cannot see it. */
function cwdOf(pid) {
  try {
    return fs.realpathSync(`/proc/${pid}/cwd`);
  } catch {
    return null; // not Linux, process gone, or not ours to inspect
  }
}

/**
 * The process group a pid belongs to, or null.
 *
 * Field 5 of /proc/<pid>/stat. Field 2 is the executable name in parentheses
 * and may itself contain spaces or parentheses, so the split starts after the
 * LAST ')' rather than tokenising the whole line.
 */
function pgidOf(pid) {
  try {
    const stat = fs.readFileSync(`/proc/${pid}/stat`, "utf8");
    const fields = stat.slice(stat.lastIndexOf(")") + 2).split(" ");
    const pgid = Number(fields[2]); // state, ppid, pgrp
    return Number.isInteger(pgid) && pgid > 0 ? pgid : null;
  } catch {
    return null;
  }
}

const alive = (pid) => {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
};

/**
 * Processes listening on `ports` that belong to the checkout at `root`.
 *
 * The cwd check is the safety rail: it is what stops this from killing an
 * unrelated program that happens to sit on one of our numbers. `orphaned`
 * relaxes it for a checkout that no longer exists on disk -- its leftover
 * servers cannot prove their provenance, and they are exactly what we are
 * trying to reap.
 */
export function findInstanceServers(ports, root, { orphaned = false } = {}) {
  const wanted = new Set(ports);
  const out = [];
  for (const { port, pid } of listeners()) {
    if (!wanted.has(port)) continue;
    const cwd = cwdOf(pid);
    const ours = cwd !== null && (cwd === root || cwd.startsWith(root + "/"));
    if (ours || orphaned) out.push({ port, pid, cwd, pgid: pgidOf(pid) });
  }
  return out;
}

/**
 * SIGTERM, then SIGKILL what did not go. Returns the pids it signalled.
 *
 * Signals the whole **process group**, not the listening process. `yarn dev` is
 * a tree -- with-instance, concurrently, two `yarn workspace` shells, and under
 * one of them `nest start --watch`, which owns a tsc watcher and respawns the
 * server it supervises. Killing only the listener frees the port and leaves the
 * supervisor running to take it straight back, plus a compiler burning CPU.
 * Every one of those shares a process group, so the group is the unit that
 * matches what a person means by "stop the dev server".
 *
 * Ownership was already established from the listener's cwd, so its job is ours
 * to end. Where the group cannot be determined, the listener is signalled alone.
 *
 * The grace period matters: vite and nest both flush and close sockets on
 * SIGTERM, and killing them outright can leave a port in TIME_WAIT that the
 * next `yarn dev` then trips over.
 */
export function stopProcesses(procs, { graceMs = 5000 } = {}) {
  const pids = [...new Set(procs.map((p) => p.pid))];
  // Never signal our own group -- that would kill the command doing the
  // stopping, along with the shell that ran it.
  const ownGroup = pgidOf(process.pid);
  const groups = [
    ...new Set(procs.map((p) => p.pgid).filter((g) => g && g !== ownGroup)),
  ];

  const signal = (sig) => {
    for (const pgid of groups) {
      try {
        process.kill(-pgid, sig);
      } catch {
        /* group already empty */
      }
    }
    for (const pid of pids) {
      try {
        process.kill(pid, sig);
      } catch {
        /* already gone */
      }
    }
  };

  signal("SIGTERM");
  const deadline = Date.now() + graceMs;
  while (Date.now() < deadline && pids.some(alive)) sleepSync(200);
  signal("SIGKILL");

  return pids;
}
