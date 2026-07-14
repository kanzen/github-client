// Build-time consumer-view check (runs in `bun run build` after bundling):
// typechecks the PUBLISHED artifact exactly as a consumer would import it —
// self-contained declarations, versioned procedures inferring, unversioned
// paths absent. Excluded from the root tsconfig (depends on dist/ existing).

import {
  configureGithubService,
  createGithubServiceClient,
  getAccessToken,
  connectUrl,
  installUrl,
  type AccessResolution,
  type AppRouter,
  type GithubServiceClient,
} from "./dist/index";
import type { inferRouterInputs, inferRouterOutputs } from "@trpc/server";

type Input = inferRouterInputs<AppRouter>["v1"]["getAccessToken"];
type Output = inferRouterOutputs<AppRouter>["v1"]["getAccessToken"];

const input: Input = { app: "markdown-review", owner: "acme", repo: "tool" };
const outcome: Output = { status: "not-connected" };
const resolution: AccessResolution = outcome;

configureGithubService({ app: "markdown-review", getSessionToken: () => null });
const viaSingleton: Promise<AccessResolution> = getAccessToken({ owner: "o", repo: "r" });
const urls: [string, string] = [connectUrl("/x"), installUrl("/install?app=a", "/x")];
const client: GithubServiceClient = createGithubServiceClient({
  app: "markdown-review",
  getSessionToken: () => null,
});

// @ts-expect-error — unversioned procedures must not exist on the type
type _Missing = inferRouterOutputs<AppRouter>["getAccessToken"];

void input;
void resolution;
void viaSingleton;
void urls;
void client;
