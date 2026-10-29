import { describe, expect, it } from "vitest";
import { getAdminRouteDecision, getLegacySeoDecision } from "./proxy";

describe("getAdminRouteDecision", () => {
  it("sends an unauthenticated admin request to login", () => {
    expect(getAdminRouteDecision("/admin/posts", false)).toBe("login");
  });
  it("allows the login page without a session", () => {
    expect(getAdminRouteDecision("/admin/login", false)).toBe("allow");
  });
  it("allows public requests", () => {
    expect(getAdminRouteDecision("/calculators", false)).toBe("allow");
  });
});

describe("getLegacySeoDecision", () => {
  it.each(["/index.html", "/home.html"])("redirects %s to the homepage", (pathname) => {
    expect(getLegacySeoDecision(pathname)).toEqual({ type: "redirect", destination: "/", statusCode: 308 });
  });

  it("redirects the old percentage calculator to the current calculator", () => {
    expect(getLegacySeoDecision("/percentage-calculator.html")).toEqual({
      type: "redirect",
      destination: "/percentage-calculator",
      statusCode: 308,
    });
  });

  it("redirects the old mortgage calculator to the current loan calculator", () => {
    expect(getLegacySeoDecision("/mortgage-calculator.html")).toEqual({
      type: "redirect",
      destination: "/loan-calculator",
      statusCode: 308,
    });
  });

  it.each([
    "/cgi-sys/suspendedpage.cgi",
    "/about-us.html",
    "/contact-us.html",
    "/bmi-calculator.html",
  ])("returns gone for the removed legacy URL %s", (pathname) => {
    expect(getLegacySeoDecision(pathname)).toEqual({ type: "gone" });
  });

  it("redirects the retired singular calculator URL to the directory", () => {
    expect(getLegacySeoDecision("/calculator")).toEqual({ type: "redirect", destination: "/calculators", statusCode: 301 });
  });

  it("ignores current public pages", () => {
    expect(getLegacySeoDecision("/calculators")).toBeNull();
  });
});
