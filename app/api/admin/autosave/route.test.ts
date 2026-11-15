import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ owner: vi.fn(), db: vi.fn() }));
vi.mock("@/lib/auth/owner", () => ({ requireOwner: mocks.owner }));
vi.mock("@/lib/db/client", () => ({ getDb: mocks.db }));
import { POST } from "./route";
const request = (body: string, origin = "https://www.solocalculator.com") => new Request("https://www.solocalculator.com/api/admin/autosave", { method: "POST", headers: { origin }, body });
describe("autosave request boundary", () => {
  beforeEach(() => vi.resetAllMocks());
  it("rejects foreign origins before reading content or accessing data", async () => {
    expect((await POST(request("{}", "https://attacker.example"))).status).toBe(403);
    expect(mocks.owner).not.toHaveBeenCalled();
    expect(mocks.db).not.toHaveBeenCalled();
  });
  it("requires authentication before parsing input", async () => {
    mocks.owner.mockRejectedValue(new Error("unauthorized"));
    await expect(POST(request("{"))).rejects.toThrow("unauthorized");
    expect(mocks.db).not.toHaveBeenCalled();
  });
  it.each(["{", '{"seo":{"__proto__":{}}}', '{"id":"invalid","version":-1}'])("rejects invalid data before writes", async (body) => {
    expect((await POST(request(body))).status).toBe(400);
    expect(mocks.db).not.toHaveBeenCalled();
  });
  it("rejects oversized data before writes", async () => {
    expect((await POST(request("x".repeat(1024 * 1024 + 1)))).status).toBe(413);
    expect(mocks.db).not.toHaveBeenCalled();
  });
  it("saves valid editor data with sanitized HTML and version protection", async () => {
    const returning = vi.fn(async () => [{ id: "saved", version: 3 }]);
    const set = vi.fn((values: unknown) => { expect(values).toBeDefined(); return { where: () => ({ returning }) }; });
    mocks.db.mockReturnValue({ update: () => ({ set }) });
    const response = await POST(request(JSON.stringify({
      id: "00000000-0000-0000-0000-000000000001", version: 2,
      title: "Draft", slug: "draft", sourceHtml: '<p>Hello</p><script>alert(1)</script>',
      editorDocument: { type: "doc", content: [] }, seo: { title: "Page title" },
    })));
    expect(response.status).toBe(200);
    expect(set.mock.calls[0][0]).toMatchObject({ title: "Draft", version: 3, sanitizedHtml: "<p>Hello</p>", seo: { title: "Page title" } });
  });
});
