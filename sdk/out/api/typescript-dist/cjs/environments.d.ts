export interface CftestApiEnvironmentUrls {
    base: string;
    production: string;
}
export declare const CftestApiEnvironment: {
    readonly Default: {
        readonly base: "https://cftest-api.gedw99.workers.dev";
        readonly production: "wss://cftest-api.gedw99.workers.dev";
    };
};
export type CftestApiEnvironment = typeof CftestApiEnvironment.Default;
