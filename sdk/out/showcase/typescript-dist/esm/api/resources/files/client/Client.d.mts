import type { BaseClientOptions, BaseRequestOptions } from "../../../../BaseClient.mjs";
import { type NormalizedClientOptionsWithAuth } from "../../../../BaseClient.mjs";
import * as core from "../../../../core/index.mjs";
import type * as Showcase from "../../../index.mjs";
export declare namespace FilesClient {
    type Options = BaseClientOptions;
    interface RequestOptions extends BaseRequestOptions {
    }
}
export declare class FilesClient {
    protected readonly _options: NormalizedClientOptionsWithAuth<FilesClient.Options>;
    constructor(options?: FilesClient.Options);
    /**
     * @param {Showcase.UploadFileRequest} request
     * @param {FilesClient.RequestOptions} requestOptions - Request-specific configuration.
     *
     * @throws {@link errors.ShowcaseError}
     * @throws {@link errors.ShowcaseTimeoutError}
     *
     * @example
     *     import { createReadStream } from "fs";
     *     await client.files.uploadFile({
     *         file: fs.createReadStream("/path/to/your/file")
     *     })
     */
    uploadFile(request: Showcase.UploadFileRequest, requestOptions?: FilesClient.RequestOptions): core.HttpResponsePromise<Showcase.UploadFileResponse>;
    private __uploadFile;
}
