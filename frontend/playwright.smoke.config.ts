import { SMOKE_SPECS, makeTierConfig } from "./playwright.tiers";

export default makeTierConfig(SMOKE_SPECS, { timeout: 90000 });
