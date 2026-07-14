// @kanzen/github-client — the consumer-facing contract of the
// kanzen GitHub service (C-contract-package, AD-trpc): the AppRouter/outcome
// types plus a ready-made client, so consumers just call `getAccessToken()`.
//
//   // once, at app startup:
//   configureGithubService({
//     app: "markdown-review",
//     getSessionToken: () => session.getToken(),
//   });
//   // anywhere:
//   const result = await getAccessToken({ owner, repo });

export type { AppRouter } from "../src/server/router";
export type { AccessResolution } from "../src/lib/resolution";
export {
  configureGithubService,
  connectUrl,
  createGithubServiceClient,
  getAccessToken,
  getGithubServiceClient,
  installUrl,
  type GetAccessTokenTarget,
  type GithubServiceClient,
  type GithubServiceClientOptions,
} from "./client";
