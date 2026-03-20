import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

import { headers } from "next/headers";

import { supabaseAdmin } from "@/lib/supabase/admin";
import type { StaffProfileRow } from "@/lib/types";

const PIN_RATE_LIMIT = {
  maxAttempts: 5,
  windowMs: 15 * 60 * 1000,
  lockWindowMs: 15 * 60 * 1000,
} as const;

type StaffLoginAttemptRow = {
  attempt_key: string;
  failure_count: number;
  locked_until: string | null;
  last_attempt_at: string;
};

type RateLimitPolicy = {
  maxAttempts: number;
  windowMs: number;
  lockWindowMs: number;
};

function getPinPepper() {
  const key = process.env.ADMIN_ACCESS_KEY?.trim();

  if (!key) {
    throw new Error("Missing ADMIN_ACCESS_KEY");
  }

  return key;
}

function safeEqualText(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return timingSafeEqual(leftBuffer, rightBuffer);
}

export function hashStaffPin(pin: string) {
  return createHmac("sha256", getPinPepper())
    .update(`staff-pin:${pin}`)
    .digest("hex");
}

export function verifyStaffPin(profile: StaffProfileRow, inputPin: string) {
  if (profile.pin_hash) {
    return safeEqualText(profile.pin_hash, hashStaffPin(inputPin));
  }

  if (profile.pin) {
    return safeEqualText(profile.pin, inputPin);
  }

  return false;
}

function getActiveAttemptCount(
  record: StaffLoginAttemptRow | null,
  policy: RateLimitPolicy,
) {
  if (!record) {
    return 0;
  }

  const lastAttemptAt = new Date(record.last_attempt_at).getTime();

  if (Number.isNaN(lastAttemptAt) || Date.now() - lastAttemptAt > policy.windowMs) {
    return 0;
  }

  return record.failure_count;
}

async function buildAttemptKey(scope: string, identifier?: string) {
  const requestHeaders = await headers();
  const forwardedFor = requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown-ip";
  const userAgent = requestHeaders.get("user-agent")?.trim() ?? "unknown-ua";

  return createHmac("sha256", getPinPepper())
    .update(
      `staff-rate-limit:${scope}:${forwardedFor}|${userAgent}|${identifier ?? "global"}`,
    )
    .digest("hex");
}

async function getAttemptRecord(attemptKey: string) {
  const { data } = await supabaseAdmin
    .from("staff_login_attempts")
    .select("attempt_key, failure_count, locked_until, last_attempt_at")
    .eq("attempt_key", attemptKey)
    .maybeSingle<StaffLoginAttemptRow>();

  return data ?? null;
}

export async function assertRateLimitAllowed(
  scope: string,
  policy: RateLimitPolicy,
  identifier?: string,
) {
  try {
    const attemptKey = await buildAttemptKey(scope, identifier);
    const record = await getAttemptRecord(attemptKey);

    if (record?.locked_until && new Date(record.locked_until).getTime() > Date.now()) {
      return {
        allowed: false as const,
        attemptKey,
      };
    }

    return {
      allowed: true as const,
      attemptKey,
    };
  } catch (error) {
    console.warn("[staff-auth] could not read pin throttle state", error);

    return {
      allowed: true as const,
      attemptKey: null,
    };
  }
}

export async function registerRateLimitAttempt(
  attemptKey: string | null,
  policy: RateLimitPolicy,
) {
  if (!attemptKey) {
    return;
  }

  try {
    const record = await getAttemptRecord(attemptKey);
    const attemptCount = getActiveAttemptCount(record, policy) + 1;
    const shouldLock = attemptCount >= policy.maxAttempts;

    await supabaseAdmin
      .from("staff_login_attempts")
      .upsert({
        attempt_key: attemptKey,
        failure_count: attemptCount,
        locked_until: shouldLock
          ? new Date(Date.now() + policy.lockWindowMs).toISOString()
          : null,
        last_attempt_at: new Date().toISOString(),
      });
  } catch (error) {
    console.warn("[staff-auth] could not record rate limit attempt", error);
  }
}

export async function clearRateLimitAttempts(attemptKey: string | null) {
  if (!attemptKey) {
    return;
  }

  try {
    await supabaseAdmin
      .from("staff_login_attempts")
      .delete()
      .eq("attempt_key", attemptKey);
  } catch (error) {
    console.warn("[staff-auth] could not clear rate limit attempts", error);
  }
}

export async function assertPinLoginAllowed() {
  return assertRateLimitAllowed("staff-pin-login", PIN_RATE_LIMIT);
}

export async function registerFailedPinAttempt(attemptKey: string | null) {
  await registerRateLimitAttempt(attemptKey, PIN_RATE_LIMIT);
}

export async function clearFailedPinAttempts(attemptKey: string | null) {
  await clearRateLimitAttempts(attemptKey);
}
