// The only file other modules may import from (eslint-plugin-boundaries).
import { databaseStore } from "./dal";
import { createLimiter } from "./service";

export { clientIp, LIMITS, type Bucket } from "./service";

export const allowRequest = createLimiter(databaseStore());
