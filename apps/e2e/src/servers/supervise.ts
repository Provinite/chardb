/**
 * Ties a spawned server's lifetime to this wrapper process's.
 *
 * Playwright runs each `webServer` command through `sh -c` in a process group
 * of its own and signals the whole group, so the real server -- `vite preview`,
 * three levels below a `yarn workspace ... exec` -- is reached directly rather
 * than through this wrapper. These handlers exist for the paths that group
 * signal does not cover: a Ctrl-C delivered to this process alone, and the
 * SIGHUP a closing terminal sends.
 *
 * The child is deliberately NOT spawned `detached`. Detaching would make it a
 * group leader of its own, outside the group Playwright signals, so a hard kill
 * of the runner would leave it holding the port -- the precise leak this is
 * meant to prevent. Staying in the group means the safety net still reaches it
 * even if this process is SIGKILLed and never runs any of this.
 */
import type { ChildProcess } from "node:child_process";

/** Long enough for nest to close its pool and vite to flush, short enough to notice. */
const FORCE_KILL_AFTER_MS = 10_000;

/**
 * Forwards shutdown signals to `child` and exits only once it has actually gone.
 *
 * The exit ordering is the point. Signalling the child and calling
 * `process.exit` in the same tick returns before the child has died, orphaning
 * it with the port still bound -- and both servers pre-probe their port, so the
 * next run fails on EADDRINUSE rather than on anything that names the cause.
 */
export function superviseChild(child: ChildProcess): void {
  let stopping = false;

  const stop = (signal: NodeJS.Signals): void => {
    // A second Ctrl-C should escalate rather than start another polite attempt.
    if (stopping) {
      child.kill("SIGKILL");
      return;
    }
    stopping = true;
    child.kill(signal);

    // unref'd so a child that exits promptly is not held open by this timer.
    setTimeout(() => child.kill("SIGKILL"), FORCE_KILL_AFTER_MS).unref();
  };

  for (const sig of ["SIGINT", "SIGTERM", "SIGHUP"] as const) {
    process.on(sig, () => stop(sig));
  }

  child.on("exit", (code, signal) => {
    // A shutdown we asked for is a success, however the child chose to die.
    // An exit we did not ask for is the server falling over, and Playwright
    // should see that as the failure it is.
    if (stopping) process.exit(0);
    process.exit(signal ? 1 : (code ?? 0));
  });
}
