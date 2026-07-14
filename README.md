# @kanzen/github-client

The ready-made client and contract types for the **kanzen GitHub service**
consumer API (`github.kanzen.sh`): configure once, then call
`getAccessToken()` anywhere.

```ts
// once, at app startup:
import { configureGithubService } from "@kanzen/github-client";

configureGithubService({
  app: "markdown-review",                        // your app id in the service registry
  getSessionToken: () => session.getToken(),     // Clerk session JWT (shared instance)
  // serviceOrigin: "http://localhost:3100",     // override for local dev
});
```

```ts
// anywhere:
import { getAccessToken, connectUrl, installUrl } from "@kanzen/github-client";

const result = await getAccessToken({ owner, repo });
switch (result.status) {
  case "authorized":            // use result.accessToken against api.github.com
  case "not-connected":         // CTA → connectUrl(location.href)
  case "reauthorize-required":  // CTA → connectUrl(location.href)
  case "not-installed":         // CTA → installUrl(result.installPath, location.href)
  case "no-repo-access":        // explain; "not-in-selection" also offers installUrl(...)
}
```

Multiple instances (tests, several apps): `createGithubServiceClient(options)`
returns the same surface without touching the singleton; the raw typed tRPC
client is available as `.trpc` / `getGithubServiceClient().trpc`.

Dependencies are self-contained: `@trpc/client` (runtime) and
`@trpc/server` (types only) come with the package — consumers install
nothing else.

Versioning: **minor** = a new API major namespace was added; **major** = an
old API major was removed (its calls then fail at compile time).

Built from the real router of the kanzen GitHub service: this repo lives
nested at `github-client/` inside a checkout of the service repo, and
`bun run build` emits the types from the service's actual source — so they
cannot drift from the server.
