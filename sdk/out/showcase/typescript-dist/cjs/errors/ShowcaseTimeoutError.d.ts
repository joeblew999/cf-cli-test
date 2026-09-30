import * as errors from "./index.js";
export declare class ShowcaseTimeoutError extends errors.ShowcaseError {
    constructor(message: string, opts?: {
        cause?: unknown;
    });
}
