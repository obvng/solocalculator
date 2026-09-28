import { describe, expect, it } from "vitest";
import { getAdminRouteDecision } from "./proxy";

describe("getAdminRouteDecision", () => {
  it("sends an unauthenticated admin request to login", () => {
    expect(getAdminRouteDecision("/admin/posts", false)).toBe("login");
  });
  it("allows the login page without a session", () => {
    expect(getAdminRouteDecision("/admin/login", false)).toBe("allow");
  });
  it("allows public requests", () => {
    expect(getAdminRouteDecision("/calculator", false)).toBe("allow");
  });
});
