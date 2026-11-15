import { describe, expect, it } from "vitest";
import { readBoundedJson } from "./bounded-json";
const request = (body: string) => new Request("https://www.solocalculator.com/api/admin/autosave", { method: "POST", body });
describe("bounded editor JSON", () => {
  it("accepts an editor object", async () => {
    await expect(readBoundedJson(request('{"title":"Draft"}'))).resolves.toEqual({ title: "Draft" });
  });
  it("counts bytes even without content length", async () => {
    await expect(readBoundedJson(request('{"title":"large"}'), 5)).rejects.toMatchObject({ status: 413 });
  });
  it.each(['null', '[]', '{', '{"seo":{"__proto__":{"polluted":true}}}', '{"constructor":{"prototype":{}}}'])("rejects malformed or dangerous JSON", async (body) => {
    await expect(readBoundedJson(request(body))).rejects.toMatchObject({ status: 400 });
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
  });
});
