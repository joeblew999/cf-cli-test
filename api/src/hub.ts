import { PublisherDurableObject } from "@orpc/experimental-publisher-durable-object";

// The pub/sub hub for new notes: oRPC's Durable Object publisher. It holds subscribers over hibernating
// WebSockets and keeps 60 s of events, so a client that reconnects with its last event id gets what it
// missed (e.g. across a redeploy).
export class NotesHub extends PublisherDurableObject {
	constructor(ctx: DurableObjectState, env: Env) {
		super(ctx, env, { resume: { retentionSeconds: 60 } });
	}
}
