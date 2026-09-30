import type { BaseClientOptions, BaseIdempotentRequestOptions, BaseRequestOptions } from "../../../../BaseClient.js";
import { type NormalizedClientOptionsWithAuth } from "../../../../BaseClient.js";
import * as core from "../../../../core/index.js";
import type * as Showcase from "../../../index.js";
export declare namespace NotesClient {
    type Options = BaseClientOptions;
    interface RequestOptions extends BaseRequestOptions {
    }
    interface IdempotentRequestOptions extends RequestOptions, BaseIdempotentRequestOptions {
    }
}
export declare class NotesClient {
    protected readonly _options: NormalizedClientOptionsWithAuth<NotesClient.Options>;
    constructor(options?: NotesClient.Options);
    /**
     * @param {Showcase.ListNotesRequest} request
     * @param {NotesClient.RequestOptions} requestOptions - Request-specific configuration.
     *
     * @throws {@link errors.ShowcaseError}
     * @throws {@link errors.ShowcaseTimeoutError}
     *
     * @example
     *     await client.notes.list()
     */
    list(request?: Showcase.ListNotesRequest, requestOptions?: NotesClient.RequestOptions): Promise<core.Page<Showcase.Note, Showcase.ListNotesResponse>>;
    /**
     * @param {Showcase.CreateNotesRequest} request
     * @param {NotesClient.IdempotentRequestOptions} requestOptions - Request-specific configuration.
     *
     * @throws {@link errors.ShowcaseError}
     * @throws {@link errors.ShowcaseTimeoutError}
     *
     * @example
     *     await client.notes.create({
     *         body: "body"
     *     })
     */
    create(request: Showcase.CreateNotesRequest, requestOptions?: NotesClient.IdempotentRequestOptions): core.HttpResponsePromise<Showcase.Note>;
    private __create;
}
