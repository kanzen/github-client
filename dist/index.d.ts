import { TRPCClient } from '@trpc/client';

export type AccessTokenResult = {
	status: "authorized";
	accessToken: string;
	accessTokenExpiresAt: string | null;
	githubLogin: string;
} | {
	status: "not-connected";
} | {
	status: "reauthorize-required";
};
export type AccessResolution = Extract<AccessTokenResult, {
	status: "authorized";
}> | {
	status: "not-connected";
} | {
	status: "reauthorize-required";
} | {
	status: "not-installed";
	installMode: "direct" | "request" | "unknown";
	installPath: string;
} | {
	status: "no-repo-access";
	reason: "no-github-access" | "not-in-selection";
	installPath?: string;
};
export type TrpcContext = {
	clerkUserId: string | null;
};
declare const appRouter: import("@trpc/server").TRPCBuiltRouter<{
	ctx: TrpcContext;
	meta: object;
	errorShape: import("@trpc/server").TRPCDefaultErrorShape;
	transformer: false;
}, import("@trpc/server").TRPCDecorateCreateRouterOptions<{
	v1: import("@trpc/server").TRPCBuiltRouter<{
		ctx: TrpcContext;
		meta: object;
		errorShape: import("@trpc/server").TRPCDefaultErrorShape;
		transformer: false;
	}, import("@trpc/server").TRPCDecorateCreateRouterOptions<{
		getAccessToken: import("@trpc/server").TRPCMutationProcedure<{
			input: {
				app: string;
				owner?: string | undefined;
				repo?: string | undefined;
			};
			output: AccessResolution;
			meta: object;
		}>;
	}>>;
}>>;
export type AppRouter = typeof appRouter;
export type GithubServiceClientOptions = {
	/** The consumer's GitHub App id in the service registry, e.g. "markdown-review". */
	app: string;
	/**
	 * Clerk session JWT for the shared kanzen instance (cross-origin auth is
	 * Bearer, never cookies). Return null when signed out — calls then resolve
	 * to tRPC UNAUTHORIZED errors.
	 */
	getSessionToken: () => Promise<string | null> | string | null;
	/** Service origin; defaults to the production deployment. */
	serviceOrigin?: string;
	/** Override for tests / non-browser runtimes. Any plain fetch-shaped function works. */
	fetch?: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
};
export type GetAccessTokenTarget = {
	owner?: string;
	repo?: string;
};
export type GithubServiceClient = {
	/**
	 * Resolve access (FR-access-resolution) and mint a token (FR-token-mint)
	 * for the configured app. Pass the PR's owner/repo when known; the
	 * outcome union tells the UI exactly which call to action to render.
	 */
	getAccessToken: (target?: GetAccessTokenTarget) => Promise<AccessResolution>;
	/** URL of the connect flow for `not-connected` / `reauthorize-required`. */
	connectUrl: (redirectTo: string) => string;
	/** URL of the install flow from a `not-installed` / `not-in-selection` outcome's installPath. */
	installUrl: (installPath: string, redirectTo: string) => string;
	/** The underlying typed tRPC client, for procedures this wrapper doesn't cover yet. */
	trpc: TRPCClient<AppRouter>;
};
export declare function configureGithubService(options: GithubServiceClientOptions): void;
/** Singleton form of GithubServiceClient.getAccessToken — see configureGithubService. */
export declare function getAccessToken(target?: GetAccessTokenTarget): Promise<AccessResolution>;
/** Singleton form of GithubServiceClient.connectUrl. */
export declare function connectUrl(redirectTo: string): string;
/** Singleton form of GithubServiceClient.installUrl. */
export declare function installUrl(installPath: string, redirectTo: string): string;
/** The configured singleton client, for anything the functions don't cover. */
export declare function getGithubServiceClient(): GithubServiceClient;
export declare function createGithubServiceClient(options: GithubServiceClientOptions): GithubServiceClient;

export {};
