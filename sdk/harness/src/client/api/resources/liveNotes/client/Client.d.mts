import type { BaseClientOptions } from "../../../../BaseClient.mjs";
import { type NormalizedClientOptionsWithAuth } from "../../../../BaseClient.mjs";
import * as core from "../../../../core/index.mjs";
import { LiveNotesSocket } from "./Socket.mjs";
export declare namespace LiveNotesClient {
    type Options = BaseClientOptions;
    interface ConnectArgs {
        /** WebSocket subprotocols to use for the connection. */
        protocols?: string | string[];
        /** Additional query parameters to send with the websocket connect request. */
        queryParams?: Record<string, unknown>;
        /** Arbitrary headers to send with the websocket connect request. */
        headers?: Record<string, string>;
        /** Enable debug mode on the websocket. Defaults to false. */
        debug?: boolean;
        /** Maximum number of times to automatically reconnect after the connection closes unexpectedly. Defaults to 30. Set to 0 to disable reconnecting. */
        reconnectAttempts?: number;
        /** The timeout for establishing the WebSocket connection in seconds. */
        connectionTimeoutInSeconds?: number;
        /** A signal to abort the WebSocket connection. */
        abortSignal?: AbortSignal;
        /** Decides whether a close event should trigger a reconnect. Return false to treat the close as terminal. Defaults to reconnecting on any close code other than 1000. */
        shouldReconnect?: (event: core.CloseEvent) => boolean;
    }
}
export declare class LiveNotesClient {
    protected readonly _options: NormalizedClientOptionsWithAuth<LiveNotesClient.Options>;
    constructor(options?: LiveNotesClient.Options);
    connect(args?: LiveNotesClient.ConnectArgs): Promise<LiveNotesSocket>;
}
