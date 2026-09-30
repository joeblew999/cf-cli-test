import * as errors from "./index.mjs";
export declare class ShowcaseTimeoutError extends errors.ShowcaseError {
    constructor(message: string, opts?: {
        cause?: unknown;
    });
}
