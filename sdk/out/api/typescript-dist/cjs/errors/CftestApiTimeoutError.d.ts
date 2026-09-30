import * as errors from "./index.js";
export declare class CftestApiTimeoutError extends errors.CftestApiError {
    constructor(message: string, opts?: {
        cause?: unknown;
    });
}
