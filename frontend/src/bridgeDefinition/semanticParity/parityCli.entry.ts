import { runParityCli } from "./parityCli";

void (async () => {
  process.exitCode = await runParityCli();
})();
