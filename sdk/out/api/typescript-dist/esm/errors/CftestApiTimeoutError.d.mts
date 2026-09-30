import * as errors from "./index.mjs";
export declare class CftestApiTimeoutError extends errors.CftestApiError {
    constructor(message: string, opts?: {
        cause?: unknown;
    });
}
