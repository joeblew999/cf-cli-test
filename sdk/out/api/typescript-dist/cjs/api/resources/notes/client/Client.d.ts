import type { BaseClientOptions, BaseRequestOptions } from "../../../../BaseClient.js";
import { type NormalizedClientOptions } from "../../../../BaseClient.js";
import * as core from "../../../../core/index.js";
import type * as CftestApi from "../../../index.js";
export declare namespace NotesClient {
    type Options = BaseClientOptions;
    interface RequestOptions extends BaseRequestOptions {
    }
}
export declare class NotesClient {
    protected readonly _options: NormalizedClientOptions<NotesClient.Options>;
    constructor(options?: NotesClient.Options);
    /**
     * @param {CftestApi.ListNotesRequest} request
     * @param {NotesClient.RequestOptions} requestOptions - Request-specific configuration.
     *
     * @throws {@link errors.CftestApiError}
     * @throws {@link errors.CftestApiTimeoutError}
     *
     * @example
     *     await client.notes.list()
     */
    list(request?: CftestApi.ListNotesRequest, requestOptions?: NotesClient.RequestOptions): Promise<core.Page<CftestApi.ListNotesResponse.Data.Item, CftestApi.ListNotesResponse>>;
    /**
     * @param {CftestApi.CreateNotesRequest} request
     * @param {NotesClient.RequestOptions} requestOptions - Request-specific configuration.
     *
     * @throws {@link errors.CftestApiError}
     * @throws {@link errors.CftestApiTimeoutError}
     *
     * @example
     *     await client.notes.create({
     *         body: "body"
     *     })
     */
    create(request: CftestApi.CreateNotesRequest, requestOptions?: NotesClient.RequestOptions): core.HttpResponsePromise<CftestApi.CreateNotesResponse>;
    private __create;
    /**
     * Each event's SSE id is the note id, so a browser EventSource resumes by itself (Last-Event-ID).
     */
    watch(request?: CftestApi.WatchNotesRequest, requestOptions?: NotesClient.RequestOptions): core.HttpResponsePromise<core.Stream<CftestApi.WatchNotesResponse>>;
    private __watch;
}
