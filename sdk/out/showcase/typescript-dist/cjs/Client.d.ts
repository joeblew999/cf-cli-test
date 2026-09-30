import type * as Showcase from "./api/index.js";
import { AuthClient } from "./api/resources/auth/client/Client.js";
import { FilesClient } from "./api/resources/files/client/Client.js";
import { LiveNotesClient } from "./api/resources/liveNotes/client/Client.js";
import { NotesClient } from "./api/resources/notes/client/Client.js";
import type { BaseClientOptions, BaseRequestOptions } from "./BaseClient.js";
import { type NormalizedClientOptionsWithAuth } from "./BaseClient.js";
import * as core from "./core/index.js";
export declare namespace ShowcaseClient {
    type Options = BaseClientOptions;
    interface RequestOptions extends BaseRequestOptions {
    }
}
export declare class ShowcaseClient {
    protected readonly _options: NormalizedClientOptionsWithAuth<ShowcaseClient.Options>;
    protected _auth: AuthClient | undefined;
    protected _notes: NotesClient | undefined;
    protected _files: FilesClient | undefined;
    protected _liveNotes: LiveNotesClient | undefined;
    constructor(options?: ShowcaseClient.Options);
    get auth(): AuthClient;
    get notes(): NotesClient;
    get files(): FilesClient;
    get liveNotes(): LiveNotesClient;
    chat(request: Showcase.ChatRequest, requestOptions?: ShowcaseClient.RequestOptions): core.HttpResponsePromise<core.Stream<Showcase.Chunk>>;
    private __chat;
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
