// The only file other modules may import from (eslint-plugin-boundaries).
import { createLimiter, memoryStore } from "./service";

export { clientIp, LIMITS, type Bucket } from "./service";

// Each server instance counts on its own until the shared table lands (SEC-07); the store is the only part that changes.
export const allowRequest = createLimiter(memoryStore());
