"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const parityCli_1 = require("./parityCli");
void (async () => {
    process.exitCode = await (0, parityCli_1.runParityCli)();
})();
