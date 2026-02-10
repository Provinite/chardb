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
