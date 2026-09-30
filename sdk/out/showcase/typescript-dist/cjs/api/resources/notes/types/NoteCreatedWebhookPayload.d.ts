import type * as Showcase from "../../../index.js";
export interface NoteCreatedWebhookPayload {
    event: string;
    note: Showcase.Note;
}
