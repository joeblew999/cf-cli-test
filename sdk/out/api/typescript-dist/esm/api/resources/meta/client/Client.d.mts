import type { BaseClientOptions, BaseRequestOptions } from "../../../../BaseClient.mjs";
import { type NormalizedClientOptions } from "../../../../BaseClient.mjs";
import * as core from "../../../../core/index.mjs";
import type * as CftestApi from "../../../index.mjs";
export declare namespace MetaClient {
    type Options = BaseClientOptions;
    interface RequestOptions extends BaseRequestOptions {
    }
}
export declare class MetaClient {
    protected readonly _options: NormalizedClientOptions<MetaClient.Options>;
    constructor(options?: MetaClient.Options);
    /**
     * @param {MetaClient.RequestOptions} requestOptions - Request-specific configuration.
     *
     * @throws {@link errors.CftestApiError}
     * @throws {@link errors.CftestApiTimeoutError}
     *
     * @example
     *     await client.meta.hello()
     */
    hello(requestOptions?: MetaClient.RequestOptions): core.HttpResponsePromise<CftestApi.HelloMetaResponse>;
    private __hello;
}
