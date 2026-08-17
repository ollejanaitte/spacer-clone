import { FULL_SPECS, makeTierConfig } from "./playwright.tiers";

export default makeTierConfig(FULL_SPECS, { timeout: 240000 });
