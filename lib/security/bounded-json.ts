export class JsonBodyError extends Error {
  constructor(readonly status: 400 | 413) { super(status === 413 ? "Request body is too large." : "Invalid JSON body."); }
}

export async function readBoundedJson(request: Request, maxBytes = 1024 * 1024): Promise<Record<string, unknown>> {
  const length = request.headers.get("content-length");
  if (length && (!/^\d+$/.test(length) || Number(length) > maxBytes)) throw new JsonBodyError(413);
  if (!request.body) throw new JsonBodyError(400);
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) { await reader.cancel(); throw new JsonBodyError(413); }
      chunks.push(value);
    }
    const bytes = new Uint8Array(total);
    let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
    const body = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
    if (!body || typeof body !== "object" || Array.isArray(body)) throw new JsonBodyError(400);
    JSON.stringify(body, (key, value) => {
      if (["__proto__", "prototype", "constructor"].includes(key)) throw new JsonBodyError(400);
      return value;
    });
    return body;
  } catch (error) {
    if (error instanceof JsonBodyError) throw error;
    throw new JsonBodyError(400);
  } finally { reader.releaseLock(); }
}
