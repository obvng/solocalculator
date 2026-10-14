type RuntimeEnvironment = Record<string, string | undefined>;

function previewValue(env: RuntimeEnvironment, previewKey: string, normalKey: string) {
  if (env.VERCEL_ENV === "preview" && env[previewKey]) return env[previewKey];
  return env[normalKey];
}

export function databaseUrl(env: RuntimeEnvironment = process.env) {
  return previewValue(env, "PREVIEW_DATABASE_URL", "DATABASE_URL");
}

export function blobToken(env: RuntimeEnvironment = process.env) {
  return previewValue(env, "PREVIEW_BLOB_READ_WRITE_TOKEN", "BLOB_READ_WRITE_TOKEN");
}
