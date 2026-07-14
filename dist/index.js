// client.ts
import { createTRPCClient, httpLink } from "@trpc/client";
var PRODUCTION_ORIGIN = "https://github.kanzen.sh";
var singleton = null;
function configureGithubService(options) {
  singleton = createGithubServiceClient(options);
}
function configured() {
  if (singleton === null) {
    throw new Error("@kanzen/github-client: call configureGithubService(...) once before using getAccessToken()/connectUrl()/installUrl()");
  }
  return singleton;
}
function getAccessToken(target) {
  return configured().getAccessToken(target);
}
function connectUrl(redirectTo) {
  return configured().connectUrl(redirectTo);
}
function installUrl(installPath, redirectTo) {
  return configured().installUrl(installPath, redirectTo);
}
function getGithubServiceClient() {
  return configured();
}
function createGithubServiceClient(options) {
  const origin = (options.serviceOrigin ?? PRODUCTION_ORIGIN).replace(/\/$/, "");
  const trpc = createTRPCClient({
    links: [
      httpLink({
        url: `${origin}/api/trpc`,
        fetch: options.fetch,
        headers: async () => {
          const token = await options.getSessionToken();
          return token === null ? {} : { Authorization: `Bearer ${token}` };
        }
      })
    ]
  });
  return {
    trpc,
    getAccessToken: (target) => trpc.v1.getAccessToken.mutate({ app: options.app, ...target }),
    connectUrl: (redirectTo) => `${origin}/connect?${new URLSearchParams({ app: options.app, redirect: redirectTo })}`,
    installUrl: (installPath, redirectTo) => {
      const url = new URL(installPath, origin);
      url.searchParams.set("redirect", redirectTo);
      return url.toString();
    }
  };
}
export {
  installUrl,
  getGithubServiceClient,
  getAccessToken,
  createGithubServiceClient,
  connectUrl,
  configureGithubService
};
