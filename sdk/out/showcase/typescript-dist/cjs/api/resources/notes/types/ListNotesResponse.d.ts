import type * as Showcase from "../../../index.js";
export interface ListNotesResponse {
    data: Showcase.Note[];
    next_cursor?: string | undefined;
}
