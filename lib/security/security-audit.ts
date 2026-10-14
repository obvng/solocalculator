import { getDb } from "@/lib/db/client";
import { securityEvents } from "@/lib/db/schema";

export const securityEventTypes = [
  "media_upload_rejected",
  "media_replacement_rejected",
  "media_cleanup_failed",
] as const;

export const securityReasonCodes = [
  "empty",
  "too_large",
  "unsupported",
  "corrupt",
  "dimensions",
  "animated",
  "cross_origin",
  "rate_limited",
  "limiter_unavailable",
  "storage_failed",
  "database_failed",
  "orphan_cleanup_failed",
] as const;

export type SecurityEventType = (typeof securityEventTypes)[number];
export type SecurityReasonCode = (typeof securityReasonCodes)[number];
export interface SecurityEventInput {
  ownerId: string | null;
  eventType: SecurityEventType;
  reasonCode: SecurityReasonCode;
  ipHash: string;
}

export async function recordSecurityEvent(
  event: SecurityEventInput,
  dependencies: { insert(values: SecurityEventInput): Promise<unknown> } = {
    insert: (values) => getDb().insert(securityEvents).values(values),
  },
) {
  if (!securityEventTypes.includes(event.eventType) || !securityReasonCodes.includes(event.reasonCode) || !/^[a-f0-9]{64}$/.test(event.ipHash)) {
    throw new Error("Invalid security event");
  }
  await dependencies.insert({
    ownerId: event.ownerId,
    eventType: event.eventType,
    reasonCode: event.reasonCode,
    ipHash: event.ipHash,
  });
}
