/**
 * @example
 *     {}
 */
export interface ListNotesRequest {
    /** Opaque cursor from the previous page's next_cursor */
    cursor?: string;
    limit?: number;
}
