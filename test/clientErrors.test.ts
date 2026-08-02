import { describe, it, expect } from "vitest";
import { describeGitHubError } from "../src/github/client.js";

describe("describeGitHubError", () => {
  it("gives an actionable message for 401", () => {
    expect(describeGitHubError({ status: 401 })).toMatch(/token.*invalid|expired/i);
  });

  it("gives an actionable message for 403", () => {
    expect(describeGitHubError({ status: 403 })).toMatch(/permission|rate limit/i);
  });

  it("gives an actionable message for 404", () => {
    expect(describeGitHubError({ status: 404 })).toMatch(/not found/i);
  });

  it("falls back to the raw error message for unknown statuses", () => {
    expect(describeGitHubError(new Error("boom"))).toBe("boom");
  });

  it("stringifies non-Error, non-status values", () => {
    expect(describeGitHubError("plain string failure")).toBe("plain string failure");
  });
});
