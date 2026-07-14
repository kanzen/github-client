// The ready-made consumer client (C-contract-package): a thin, configured
// wrapper over @trpc/client so consumers call `getAccessToken()` directly
// instead of wiring tRPC themselves. Runtime code — but it only ever
// `import type`s from ../src, so no server code is bundled.

import { createTRPCClient, httpLink, type TRPCClient } from "@trpc/client";

import type { AccessResolution } from "../src/lib/resolution";
import type { AppRouter } from "../src/server/router";

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

export type GetAccessTokenTarget = { owner?: string; repo?: string };

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

const PRODUCTION_ORIGIN = "https://github.kanzen.sh";

// ---- Singleton surface: configure once at app startup, then import and
// call the functions directly anywhere.
//
//   configureGithubService({ app: "markdown-review", getSessionToken: … });
//   const result = await getAccessToken({ owner, repo });

let singleton: GithubServiceClient | null = null;

export function configureGithubService(options: GithubServiceClientOptions): void {
  singleton = createGithubServiceClient(options);
}

function configured(): GithubServiceClient {
  if (singleton === null) {
    throw new Error(
      "@kanzen/github-client: call configureGithubService(...) once before using getAccessToken()/connectUrl()/installUrl()",
    );
  }
  return singleton;
}

/** Singleton form of GithubServiceClient.getAccessToken — see configureGithubService. */
export function getAccessToken(target?: GetAccessTokenTarget): Promise<AccessResolution> {
  return configured().getAccessToken(target);
}

/** Singleton form of GithubServiceClient.connectUrl. */
export function connectUrl(redirectTo: string): string {
  return configured().connectUrl(redirectTo);
}

/** Singleton form of GithubServiceClient.installUrl. */
export function installUrl(installPath: string, redirectTo: string): string {
  return configured().installUrl(installPath, redirectTo);
}

/** The configured singleton client, for anything the functions don't cover. */
export function getGithubServiceClient(): GithubServiceClient {
  return configured();
}

export function createGithubServiceClient(
  options: GithubServiceClientOptions,
): GithubServiceClient {
  const origin = (options.serviceOrigin ?? PRODUCTION_ORIGIN).replace(/\/$/, "");
  const trpc = createTRPCClient<AppRouter>({
    links: [
      httpLink({
        url: `${origin}/api/trpc`,
        fetch: options.fetch,
        headers: async () => {
          const token = await options.getSessionToken();
          return token === null ? {} : { Authorization: `Bearer ${token}` };
        },
      }),
    ],
  });

  return {
    trpc,
    getAccessToken: (target) =>
      trpc.v1.getAccessToken.mutate({ app: options.app, ...target }),
    connectUrl: (redirectTo) =>
      `${origin}/connect?${new URLSearchParams({ app: options.app, redirect: redirectTo })}`,
    installUrl: (installPath, redirectTo) => {
      const url = new URL(installPath, origin);
      url.searchParams.set("redirect", redirectTo);
      return url.toString();
    },
  };
}
