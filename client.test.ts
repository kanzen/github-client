import { authMock, resetHarness } from "../src/test/harness";

import { beforeEach, describe, expect, test } from "bun:test";

import { seedLink } from "../src/test/seed";

const { POST } = await import("../src/app/api/trpc/[trpc]/route");
const {
  configureGithubService,
  createGithubServiceClient,
  getAccessToken,
} = await import("./client");

// NFR-security-regression / C-contract-package: the shipped client must
// speak the real server's protocol. These tests wire the client's fetch
// straight into the actual route handler — URL shape, body encoding, and
// the Authorization header are exercised end to end, so a drift between
// the published client and the server breaks here first.

beforeEach(resetHarness);

// Capture what the client actually sends while delegating to the handler.
const sentRequests: Request[] = [];
function makeClient(sessionToken: string | null) {
  return createGithubServiceClient({
    app: "markdown-review",
    serviceOrigin: "http://localhost:3100",
    getSessionToken: () => sessionToken,
    fetch: async (input, init) => {
      const request = new Request(input, init);
      sentRequests.push(request.clone());
      return POST(request);
    },
  });
}

describe("createGithubServiceClient", () => {
  test("getAccessToken round-trips through the real route handler", async () => {
    authMock.mockImplementation(async () => ({ userId: "user_a" }));
    seedLink("user_a", { accessToken: "ghu_via_client", login: "octo" });
    const github = makeClient("clerk-session-jwt");
    const result = await github.getAccessToken();
    expect(result.status).toBe("authorized");
    if (result.status === "authorized") expect(result.accessToken).toBe("ghu_via_client");

    const sent = sentRequests.at(-1)!;
    expect(new URL(sent.url).pathname).toBe("/api/trpc/v1.getAccessToken");
    expect(sent.headers.get("authorization")).toBe("Bearer clerk-session-jwt");
    // The configured app id is injected into every call.
    expect(await sent.json()).toMatchObject({ app: "markdown-review" });
  });

  test("owner/repo pass through to resolution (unknown app would 400)", async () => {
    authMock.mockImplementation(async () => ({ userId: "user_a" }));
    seedLink("user_a");
    const github = makeClient("jwt");
    // Unknown app id must be rejected by the server, not silently accepted.
    const rogue = createGithubServiceClient({
      app: "not-a-registered-app",
      serviceOrigin: "http://localhost:3100",
      getSessionToken: () => "jwt",
      fetch: async (input, init) => POST(new Request(input, init)),
    });
    await expect(rogue.getAccessToken()).rejects.toThrow();
    // While the registered app succeeds.
    const result = await github.getAccessToken();
    expect(result.status).toBe("authorized");
  });

  test("signed-out client (null token) is rejected by the procedure", async () => {
    const github = makeClient(null);
    await expect(github.getAccessToken()).rejects.toThrow(/UNAUTHORIZED/);
  });

  test("singleton: configureGithubService once, then bare getAccessToken()", async () => {
    authMock.mockImplementation(async () => ({ userId: "user_a" }));
    seedLink("user_a", { accessToken: "ghu_singleton" });
    configureGithubService({
      app: "markdown-review",
      serviceOrigin: "http://localhost:3100",
      getSessionToken: () => "jwt",
      fetch: async (input, init) => POST(new Request(input, init)),
    });
    const result = await getAccessToken();
    expect(result.status).toBe("authorized");
    if (result.status === "authorized") expect(result.accessToken).toBe("ghu_singleton");
  });

  test("CTA URL helpers build allowlist-ready service URLs", () => {
    const github = makeClient("jwt");
    expect(github.connectUrl("http://localhost:3000/review/o/r/1")).toBe(
      "http://localhost:3100/connect?app=markdown-review&redirect=http%3A%2F%2Flocalhost%3A3000%2Freview%2Fo%2Fr%2F1",
    );
    expect(
      github.installUrl("/install?app=markdown-review&target_id=7", "http://localhost:3000/pr"),
    ).toBe(
      "http://localhost:3100/install?app=markdown-review&target_id=7&redirect=http%3A%2F%2Flocalhost%3A3000%2Fpr",
    );
  });
});
