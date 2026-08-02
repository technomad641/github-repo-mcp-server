import { describe, it, expect } from "vitest";
import { loadConfig, isRepoAllowed, assertRepoAllowed } from "../src/config.js";

describe("config allowlist", () => {
  it("loads the repos array from config.json", () => {
    const config = loadConfig();
    expect(config.repos).toContain("technomad641/AI-For-Beginners");
  });

  it("allows a repo that's in the allowlist", () => {
    expect(isRepoAllowed("technomad641", "AI-For-Beginners")).toBe(true);
  });

  it("rejects a repo that's not in the allowlist", () => {
    expect(isRepoAllowed("someone-else", "some-repo")).toBe(false);
  });

  it("assertRepoAllowed throws for a disallowed repo", () => {
    expect(() => assertRepoAllowed("someone-else", "some-repo")).toThrow(/not in the config\.json allowlist/);
  });

  it("assertRepoAllowed does not throw for an allowed repo", () => {
    expect(() => assertRepoAllowed("technomad641", "AI-For-Beginners")).not.toThrow();
  });
});
