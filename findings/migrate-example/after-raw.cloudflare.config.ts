import { bindings, defineConfig, triggers } from "cf/config";

/**
 * Wrangler environments are selected through ctx.mode and the cf --mode flag.
 * @see https://developers.cloudflare.com/workers/wrangler/environments/
 */

/**
 * This migration needs manual work. Resolve every TODO in this file, then remove the error below.
 */
/**
 * TODO(@cloudflare): cf migrate: d1_databases.0: The options `migrations_dir` at `d1_databases.0` require manual migration.
 */
/**
 * TODO(@cloudflare): cf migrate: durable_objects.bindings.0: Durable Object bindings require manual review after migration.
 * @see https://developers.cloudflare.com/workers/runtime-apis/context/#exports
 */
/**
 * TODO(@cloudflare): cf migrate: migrations: Wrangler Durable Object migrations are unsupported. Replace them with an exports lifecycle declaration, for example `exports: { MyDurableObject: exports.durableObject({ storage: "sqlite" }) }`.
 * @see https://developers.cloudflare.com/workers/runtime-apis/context/#exports
 */
/**
 * TODO(@cloudflare): cf migrate: env.staging.d1_databases.0: The options `migrations_dir` at `env.staging.d1_databases.0` require manual migration.
 */
/**
 * TODO(@cloudflare): cf migrate: env.staging.durable_objects.bindings.0: Durable Object bindings require manual review after migration.
 * @see https://developers.cloudflare.com/workers/runtime-apis/context/#exports
 */
/**
 * TODO(@cloudflare): cf migrate: env.staging.migrations: Wrangler Durable Object migrations are unsupported. Replace them with an exports lifecycle declaration, for example `exports: { MyDurableObject: exports.durableObject({ storage: "sqlite" }) }`.
 * @see https://developers.cloudflare.com/workers/runtime-apis/context/#exports
 */
throw new Error("Migration incomplete. Resolve every cf migrate TODO in `cloudflare.config.ts`.");

export default defineConfig((ctx) => {
	switch (ctx.mode) {
		case "staging": {
			return {
				worker: {
					name: "cftest-legacy-staging",
					compatibilityDate: "2026-09-01",
					compatibilityFlags: [
						"nodejs_compat",
					],
					entrypoint: "src/index.ts",
					workersDev: true,
					observability: {
						enabled: true,
					},
					assets: {
						runWorkerFirst: [
							"/api/*",
						],
					},
					env: {
						GREETING: bindings.text("hello-staging"),
						APP_ENV: bindings.text("staging"),
						FEATURES: bindings.json({
							beta: true,
						}),
						DB: bindings.d1({
							name: "cftest-legacy-db",
							id: "ede76f7c-1324-4d50-a781-39a3cce7cd50",
						}),
						KV: bindings.kv({
							id: "bd30195a38fa4f1cbdf17dffa7f17f92",
						}),
						BUCKET: bindings.r2({
							name: "cftest-legacy-bucket",
						}),
						COUNTER: bindings.durableObject({
							worker: "cftest-legacy-staging",
							exportName: "Counter",
						}),
						ASSETS: bindings.assets(),
					},
					/**
					 * TODO(@cloudflare): cf migrate: The options `migrations_dir` at `env.staging.d1_databases.0` require manual migration.
					 */
					/**
					 * TODO(@cloudflare): cf migrate: Durable Object bindings require manual review after migration.
					 * @see https://developers.cloudflare.com/workers/runtime-apis/context/#exports
					 */
					/**
					 * TODO(@cloudflare): cf migrate: Wrangler Durable Object migrations are unsupported. Replace them with an exports lifecycle declaration, for example `exports: { MyDurableObject: exports.durableObject({ storage: "sqlite" }) }`.
					 * @see https://developers.cloudflare.com/workers/runtime-apis/context/#exports
					 */
				},
			};
		}
		default: {
			return {
				worker: {
					name: "cftest-legacy",
					compatibilityDate: "2026-09-01",
					compatibilityFlags: [
						"nodejs_compat",
					],
					entrypoint: "src/index.ts",
					workersDev: true,
					observability: {
						enabled: true,
					},
					assets: {
						runWorkerFirst: [
							"/api/*",
						],
					},
					triggers: [
						triggers.scheduled({
							schedule: "*/30 * * * *",
						}),
					],
					env: {
						GREETING: bindings.text("hello-prod"),
						APP_ENV: bindings.text("production"),
						FEATURES: bindings.json({
							beta: false,
						}),
						DB: bindings.d1({
							name: "cftest-legacy-db",
							id: "ede76f7c-1324-4d50-a781-39a3cce7cd50",
						}),
						KV: bindings.kv({
							id: "af436682654144aa85eb7e5c60de7fae",
						}),
						BUCKET: bindings.r2({
							name: "cftest-legacy-bucket",
						}),
						COUNTER: bindings.durableObject({
							worker: "cftest-legacy",
							exportName: "Counter",
						}),
						ASSETS: bindings.assets(),
					},
					/**
					 * TODO(@cloudflare): cf migrate: The options `migrations_dir` at `d1_databases.0` require manual migration.
					 */
					/**
					 * TODO(@cloudflare): cf migrate: Durable Object bindings require manual review after migration.
					 * @see https://developers.cloudflare.com/workers/runtime-apis/context/#exports
					 */
					/**
					 * TODO(@cloudflare): cf migrate: Wrangler Durable Object migrations are unsupported. Replace them with an exports lifecycle declaration, for example `exports: { MyDurableObject: exports.durableObject({ storage: "sqlite" }) }`.
					 * @see https://developers.cloudflare.com/workers/runtime-apis/context/#exports
					 */
				},
			};
		}
	}
});
