import type * as Showcase from "../../../index.mjs";
export interface ListNotesResponse {
    data: Showcase.Note[];
    next_cursor?: string | undefined;
}
