import { createHash, createHmac, timingSafeEqual } from "node:crypto";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { supabaseAdmin } from "@/lib/supabase/admin";
import type { StaffContext, StaffProfileRow, StaffRole } from "@/lib/types";

const ADMIN_COOKIE_NAME = "torneo_admin_session";
const STAFF_COOKIE_NAME = "torneo_staff_session";

type AdminAccessContext =
  | {
      mode: "legacy";
      role: "admin";
      profile: null;
      authUserId: null;
    }
  | {
      mode: "staff";
      role: StaffRole;
      profile: StaffProfileRow;
      authUserId: string;
    };

function getAdminAccessKey() {
  const key = process.env.ADMIN_ACCESS_KEY;

  if (!key) {
    throw new Error("Missing ADMIN_ACCESS_KEY");
  }

  return key;
}

function hashValue(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function signStaffId(staffId: string) {
  return createHmac("sha256", getAdminAccessKey()).update(staffId).digest("hex");
}

export function isValidAdminAccessKey(input: string) {
  const expected = Buffer.from(getAdminAccessKey());
  const current = Buffer.from(input);

  if (expected.length !== current.length) {
    return false;
  }

  return timingSafeEqual(expected, current);
}

/* ── Legacy admin session (passphrase) ── */

export async function setLegacyAdminSession() {
  const store = await cookies();

  store.set(ADMIN_COOKIE_NAME, hashValue(getAdminAccessKey()), {
    httpOnly: true,
    sameSite: "lax",
    secure: true,
    path: "/",
    maxAge: 60 * 60 * 4,
  });
}

export async function clearLegacyAdminSession() {
  const store = await cookies();
  store.delete(ADMIN_COOKIE_NAME);
}

async function hasLegacyAdminSession() {
  const store = await cookies();
  const token = store.get(ADMIN_COOKIE_NAME)?.value;

  return token === hashValue(getAdminAccessKey());
}

/* ── PIN staff session ── */

export async function setPinSession(staffId: string) {
  const store = await cookies();
  const signature = signStaffId(staffId);

  store.set(STAFF_COOKIE_NAME, `${staffId}.${signature}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: true,
    path: "/",
    maxAge: 60 * 60 * 8,
  });
}

export async function clearPinSession() {
  const store = await cookies();
  store.delete(STAFF_COOKIE_NAME);
}

async function getPinSessionStaffId(): Promise<string | null> {
  const store = await cookies();
  const value = store.get(STAFF_COOKIE_NAME)?.value;

  if (!value) {
    return null;
  }

  const dotIndex = value.indexOf(".");

  if (dotIndex < 1) {
    return null;
  }

  const staffId = value.slice(0, dotIndex);
  const signature = value.slice(dotIndex + 1);
  const expectedSignature = signStaffId(staffId);

  if (signature.length !== expectedSignature.length) {
    return null;
  }

  const valid = timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature),
  );

  return valid ? staffId : null;
}

async function getStaffProfileFromPinSession(): Promise<{
  authUserId: string;
  profile: StaffProfileRow;
} | null> {
  const staffId = await getPinSessionStaffId();

  if (!staffId) {
    return null;
  }

  const { data: profile } = await supabaseAdmin
    .from("staff_profiles")
    .select("*")
    .eq("id", staffId)
    .eq("is_active", true)
    .maybeSingle<StaffProfileRow>();

  if (!profile) {
    return null;
  }

  return {
    authUserId: profile.auth_user_id ?? profile.id,
    profile,
  };
}

/* ── Access context ── */

export async function getAdminAccessContext(): Promise<AdminAccessContext | null> {
  const staff = await getStaffProfileFromPinSession();

  if (staff) {
    return {
      mode: "staff",
      role: staff.profile.role,
      profile: staff.profile,
      authUserId: staff.authUserId,
    };
  }

  if (await hasLegacyAdminSession()) {
    return {
      mode: "legacy",
      role: "admin",
      profile: null,
      authUserId: null,
    };
  }

  return null;
}

export async function requireAdminSession() {
  const context = await getAdminAccessContext();

  if (!context || context.role !== "admin") {
    redirect("/login?error=restricted");
  }

  return context;
}

export async function requireStaffSession(allowedRoles?: StaffRole[]) {
  const staff = await getStaffProfileFromPinSession();

  if (staff) {
    if (allowedRoles && !allowedRoles.includes(staff.profile.role)) {
      redirect("/login?error=restricted");
    }

    return {
      authUserId: staff.authUserId,
      profile: staff.profile,
    };
  }

  if (await hasLegacyAdminSession()) {
    const legacyAdmin: StaffContext = {
      authUserId: null,
      profile: {
        id: "legacy-admin",
        auth_user_id: null,
        email: "legacy-admin@local",
        full_name: "Admin temporal",
        role: "admin",
        pin: null,
        is_active: true,
        created_at: new Date(0).toISOString(),
        updated_at: new Date(0).toISOString(),
      },
    };

    if (allowedRoles && !allowedRoles.includes(legacyAdmin.profile.role)) {
      redirect("/login?error=restricted");
    }

    return legacyAdmin;
  }

  redirect("/login");
}

export async function signOutStaffSession() {
  await clearPinSession();
  await clearLegacyAdminSession();
}
