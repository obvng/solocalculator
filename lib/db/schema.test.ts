import { describe, expect, it } from "vitest";
import {
  owners,
  sessions,
  posts,
  postRevisions,
  siteSettings,
} from "./schema";

describe("Neon schema", () => {
  it("exports the tables required by owner publishing", () => {
    expect(owners).toBeDefined();
    expect(sessions).toBeDefined();
    expect(posts).toBeDefined();
    expect(postRevisions).toBeDefined();
    expect(siteSettings).toBeDefined();
  });
});
