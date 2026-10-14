import { describe, expect, it } from "vitest";
import {
  media,
  owners,
  sessions,
  posts,
  postRevisions,
  siteSettings,
  securityEvents,
  uploadRateLimits,
} from "./schema";

describe("Neon schema", () => {
  it("exports the tables required by owner publishing", () => {
    expect(owners).toBeDefined();
    expect(sessions).toBeDefined();
    expect(posts).toBeDefined();
    expect(postRevisions).toBeDefined();
    expect(siteSettings).toBeDefined();
    expect(media).toBeDefined();
    expect(securityEvents).toBeDefined();
    expect(uploadRateLimits).toBeDefined();
  });
});
