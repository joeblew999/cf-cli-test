export interface ShowcaseEnvironmentUrls {
    base: string;
    production: string;
}
export declare const ShowcaseEnvironment: {
    readonly Default: {
        readonly base: "https://cftest-sdk-api.gedw99.workers.dev/api/mock";
        readonly production: "wss://api.example.com";
    };
};
export type ShowcaseEnvironment = typeof ShowcaseEnvironment.Default;
