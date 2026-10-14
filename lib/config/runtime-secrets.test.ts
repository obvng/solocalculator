import { describe, expect, it } from "vitest";
import { databaseUrl, blobToken } from "./runtime-secrets";

describe("runtime secret selection", () => {
  it("uses isolated Preview values only in Vercel Preview", () => {
    const env = { VERCEL_ENV: "preview", PREVIEW_DATABASE_URL: "preview-db", DATABASE_URL: "production-db", PREVIEW_BLOB_READ_WRITE_TOKEN: "preview-blob", BLOB_READ_WRITE_TOKEN: "production-blob" };
    expect(databaseUrl(env)).toBe("preview-db");
    expect(blobToken(env)).toBe("preview-blob");
  });

  it("uses normal values outside Preview", () => {
    const env = { VERCEL_ENV: "production", PREVIEW_DATABASE_URL: "preview-db", DATABASE_URL: "production-db", PREVIEW_BLOB_READ_WRITE_TOKEN: "preview-blob", BLOB_READ_WRITE_TOKEN: "production-blob" };
    expect(databaseUrl(env)).toBe("production-db");
    expect(blobToken(env)).toBe("production-blob");
  });
});
