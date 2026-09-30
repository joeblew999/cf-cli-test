import { LiveNotesClient } from "./api/resources/liveNotes/client/Client.js";
import { MetaClient } from "./api/resources/meta/client/Client.js";
import { NotesClient } from "./api/resources/notes/client/Client.js";
import type { BaseClientOptions, BaseRequestOptions } from "./BaseClient.js";
import { type NormalizedClientOptions } from "./BaseClient.js";
import * as core from "./core/index.js";
export declare namespace CftestApiClient {
    type Options = BaseClientOptions;
    interface RequestOptions extends BaseRequestOptions {
    }
}
export declare class CftestApiClient {
    protected readonly _options: NormalizedClientOptions<CftestApiClient.Options>;
    protected _meta: MetaClient | undefined;
    protected _notes: NotesClient | undefined;
    protected _liveNotes: LiveNotesClient | undefined;
    constructor(options?: CftestApiClient.Options);
    get meta(): MetaClient;
    get notes(): NotesClient;
    get liveNotes(): LiveNotesClient;
    /**
     * Make a passthrough request using the SDK's configured auth, retry, logging, etc.
     * This is useful for making requests to endpoints not yet supported in the SDK.
     * The input can be a URL string, URL object, or Request object. Relative paths are resolved against the configured base URL.
     *
     * @param {Request | string | URL} input - The URL, path, or Request object.
     * @param {RequestInit} init - Standard fetch RequestInit options.
     * @param {core.PassthroughRequest.RequestOptions} requestOptions - Per-request overrides (timeout, retries, headers, abort signal).
     * @returns {Promise<Response>} A standard Response object.
     */
    fetch(input: Request | string | URL, init?: RequestInit, requestOptions?: core.PassthroughRequest.RequestOptions): Promise<Response>;
}
