import { homedir } from "node:os";
import { createInterface } from "node:readline/promises";
import { defaultCredentialsPath } from "./credentials";
import { run } from "./run";

// A reader that stops early (`| head`) closes the pipe; there is no one left
// to tell.
process.stdout.on("error", (err: NodeJS.ErrnoException) => {
  if (err.code === "EPIPE") process.exit(process.exitCode ?? 0);
  throw err;
});

async function readStdin(): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks).toString("utf8");
}

async function ask(question: string): Promise<string> {
  // Asked on stderr, so a question never lands in piped stdout.
  const rl = createInterface({ input: process.stdin, output: process.stderr });
  try {
    return await rl.question(question);
  } finally {
    rl.close();
  }
}

const exitCode = await run({
  argv: process.argv.slice(2),
  env: process.env,
  fetch: globalThis.fetch,
  stdin: readStdin,
  stdout: (text) => process.stdout.write(text),
  stderr: (text) => process.stderr.write(text),
  interactive: Boolean(process.stdin.isTTY && process.stderr.isTTY),
  ask,
  credentialsPath: defaultCredentialsPath(process.env, homedir()),
  // Yarn runs the script from the package. INIT_CWD is where it was typed,
  // except that `yarn workspace` resets it, so the root script passes it on.
  cwd: process.env.CHARDB_CLI_CWD || process.env.INIT_CWD || process.cwd(),
});
process.exitCode = exitCode;
