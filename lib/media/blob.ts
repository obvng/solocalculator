import { del, put } from "@vercel/blob";

export function makeBlobPath(filename: string, id = crypto.randomUUID(), now = new Date()) {
  const extension = filename.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "image";
  return `media/${now.toISOString().slice(0, 10)}/${id}.${extension}`;
}

export async function putMediaBlob(file: File) {
  const pathname = makeBlobPath(file.name);
  const blob = await put(pathname, file, { access: "public", addRandomSuffix: false, contentType: file.type });
  return { pathname: blob.pathname, url: blob.url };
}

export async function removeMediaBlob(pathname: string) {
  await del(pathname);
}
