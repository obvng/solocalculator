import { describe, expect, it } from "vitest";
import { databaseConnectionOptions } from "./client";

describe("database client", () => {
  it("fails over quickly when the database cannot be reached", () => {
    expect(databaseConnectionOptions).toMatchObject({
      prepare: false,
      max: 5,
      connect_timeout: 5,
    });
  });
});
