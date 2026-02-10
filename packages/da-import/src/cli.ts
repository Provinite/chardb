import yargs from "yargs";
import { hideBin } from "yargs/helpers";

yargs(hideBin(process.argv))
  .scriptName("da-import")
  .usage("$0 <command> [options]")
  .demandCommand(1, "You must specify a command")
  .strict()
  .help()
  .parseAsync();
