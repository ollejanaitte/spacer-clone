import { CRITICAL_SPECS, makeTierConfig } from "./playwright.tiers";

export default makeTierConfig(CRITICAL_SPECS, { timeout: 180000 });
