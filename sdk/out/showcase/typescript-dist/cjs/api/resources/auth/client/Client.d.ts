import type { BaseClientOptions, BaseRequestOptions } from "../../../../BaseClient.js";
import { type NormalizedClientOptions } from "../../../../BaseClient.js";
import * as core from "../../../../core/index.js";
import type * as Showcase from "../../../index.js";
export declare namespace AuthClient {
    type Options = BaseClientOptions;
    interface RequestOptions extends BaseRequestOptions {
    }
}
export declare class AuthClient {
    protected readonly _options: NormalizedClientOptions<AuthClient.Options>;
    constructor(options?: AuthClient.Options);
    /**
     * @param {Showcase.GetTokenRequest} request
     * @param {AuthClient.RequestOptions} requestOptions - Request-specific configuration.
     *
     * @throws {@link errors.ShowcaseError}
     * @throws {@link errors.ShowcaseTimeoutError}
     *
     * @example
     *     await client.auth.getToken({
     *         client_id: "client_id",
     *         client_secret: "client_secret"
     *     })
     */
    getToken(request: Showcase.GetTokenRequest, requestOptions?: AuthClient.RequestOptions): core.HttpResponsePromise<Showcase.GetTokenResponse>;
    private __getToken;
}
