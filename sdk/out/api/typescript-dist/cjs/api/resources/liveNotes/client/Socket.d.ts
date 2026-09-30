import * as core from "../../../../core/index.js";
import type * as CftestApi from "../../../index.js";
export declare namespace LiveNotesSocket {
    interface Args {
        socket: core.ReconnectingWebSocket;
    }
    type Response = CftestApi.Note;
    type EventHandlers = {
        open?: () => void;
        message?: (message: Response) => void;
        close?: (event: core.CloseEvent) => void;
        error?: (error: Error) => void;
    };
}
export declare class LiveNotesSocket {
    readonly socket: core.ReconnectingWebSocket;
    protected readonly eventHandlers: LiveNotesSocket.EventHandlers;
    private handleOpen;
    private handleMessage;
    private handleClose;
    private handleError;
    constructor(args: LiveNotesSocket.Args);
    /** The current state of the connection; this is one of the readyState constants. */
    get readyState(): core.ReconnectingWebSocket.ReadyState;
    /**
     * @param event - The event to attach to.
     * @param callback - The callback to run when the event is triggered.
     * Usage:
     * ```typescript
     * this.on('open', () => {
     *     console.log('The websocket is open');
     * });
     * ```
     */
    on<T extends keyof LiveNotesSocket.EventHandlers>(event: T, callback: LiveNotesSocket.EventHandlers[T]): void;
    /**
     * @param event - The event to detach from.
     * @param callback - The callback previously registered with `on`. No-op if it is not the callback currently registered for this event.
     * Usage:
     * ```typescript
     * const handler = () => console.log('The websocket is open');
     * this.on('open', handler);
     * this.off('open', handler);
     * ```
     */
    off<T extends keyof LiveNotesSocket.EventHandlers>(event: T, callback: LiveNotesSocket.EventHandlers[T]): void;
    /** Connect to the websocket and register event handlers. Safe to call multiple times: each handler is only registered if it is not already attached. */
    connect(): LiveNotesSocket;
    /** Close the websocket and unregister event handlers. */
    close(): void;
    /** Returns a promise that resolves when the websocket is open. */
    waitForOpen(): Promise<core.ReconnectingWebSocket>;
    /** Send a binary payload to the websocket. */
    protected sendBinary(payload: ArrayBuffer | Blob | ArrayBufferView): void;
    /** Send a JSON payload to the websocket. */
    protected sendJson(payload: never): void;
}
