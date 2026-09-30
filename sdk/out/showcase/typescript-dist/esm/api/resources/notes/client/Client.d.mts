import type { BaseClientOptions, BaseIdempotentRequestOptions, BaseRequestOptions } from "../../../../BaseClient.mjs";
import { type NormalizedClientOptionsWithAuth } from "../../../../BaseClient.mjs";
import * as core from "../../../../core/index.mjs";
import type * as Showcase from "../../../index.mjs";
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
