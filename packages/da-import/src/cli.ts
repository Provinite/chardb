import * as fs from "fs";
import * as path from "path";

// Load .env from package root before anything else
const envPath = path.resolve(process.cwd(), ".env");
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, "utf-8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx);
    const val = trimmed.slice(eqIdx + 1).replace(/^["']|["']$/g, "");
    if (!process.env[key]) {
      process.env[key] = val;
    }
  }
}

import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import { downloadCommand } from "./commands/download";
import { parseCommand } from "./commands/parse";
import { importCommand } from "./commands/import";
import { reportCommand } from "./commands/report";
import { scaffoldMappingCommand } from "./commands/scaffold-mapping";

yargs(hideBin(process.argv))
  .scriptName("da-import")
  .usage("$0 <command> [options]")
  .command(downloadCommand)
  .command(parseCommand)
  .command(importCommand)
  .command(reportCommand)
  .command(scaffoldMappingCommand)
  .demandCommand(1, "You must specify a command")
  .strict()
  .help()
  .parseAsync();
