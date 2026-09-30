import type * as Showcase from "../../../index.mjs";
export interface NoteCreatedWebhookPayload {
    event: string;
    note: Showcase.Note;
}
