import { describe, expect, it } from "vitest";
import { getPageSeo } from "./repository";

describe("getPageSeo", () => {
  it("uses code defaults when the database read fails", async () => {
    const record = await getPageSeo("loan-calculator", {
      getPageSeo: async () => { throw new Error("offline"); },
    });
    expect(record.pageKey).toBe("loan-calculator");
    expect(record.title).toBe("Loan calculator | SoloCalculator");
    expect(record.pathname).toBe("/loan-calculator");
  });
});
