import { createHash, timingSafeEqual } from "node:crypto";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { StaffContext, StaffProfileRow, StaffRole } from "@/lib/types";

const ADMIN_COOKIE_NAME = "torneo_admin_session";
export const POST_LOGIN_COOKIE_NAME = "torneo_post_login";

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

export function isValidAdminAccessKey(input: string) {
  const expected = Buffer.from(getAdminAccessKey());
  const current = Buffer.from(input);

  if (expected.length !== current.length) {
    return false;
  }

  return timingSafeEqual(expected, current);
}

export async function setLegacyAdminSession() {
  const store = await cookies();

  store.set(ADMIN_COOKIE_NAME, hashValue(getAdminAccessKey()), {
    httpOnly: true,
    sameSite: "lax",
    secure: true,
    path: "/",
    maxAge: 60 * 60 * 12,
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

export async function setPostLoginTarget(pathname: string) {
  const store = await cookies();
  store.set(POST_LOGIN_COOKIE_NAME, pathname, {
    httpOnly: true,
    sameSite: "lax",
    secure: true,
    path: "/",
    maxAge: 60 * 10,
  });
}

export async function consumePostLoginTarget() {
  const store = await cookies();
  const nextPath = store.get(POST_LOGIN_COOKIE_NAME)?.value ?? null;
  store.delete(POST_LOGIN_COOKIE_NAME);
  return nextPath;
}

export async function getAuthenticatedStaffProfile() {
  const supabase = await createSupabaseServerClient();
  const claimsResult = await supabase.auth.getClaims();
  const claims = claimsResult.data?.claims;

  const authUserId = claims?.sub;

  if (!authUserId) {
    return null;
  }

  const { data: profile } = await supabaseAdmin
    .from("staff_profiles")
    .select("*")
    .eq("auth_user_id", authUserId)
    .eq("is_active", true)
    .maybeSingle<StaffProfileRow>();

  if (profile) {
    return {
      authUserId,
      profile,
    };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const email = user?.email?.toLowerCase();

  if (!email) {
    return null;
  }

  const { data: fallbackProfile } = await supabaseAdmin
    .from("staff_profiles")
    .select("*")
    .eq("email", email)
    .eq("is_active", true)
    .is("auth_user_id", null)
    .maybeSingle<StaffProfileRow>();

  if (!fallbackProfile) {
    return null;
  }

  const { data: linkedProfile } = await supabaseAdmin
    .from("staff_profiles")
    .update({
      auth_user_id: authUserId,
    })
    .eq("id", fallbackProfile.id)
    .select("*")
    .single<StaffProfileRow>();

  if (!linkedProfile) {
    return null;
  }

  return {
    authUserId,
    profile: linkedProfile,
  };
}

export async function getAdminAccessContext(): Promise<AdminAccessContext | null> {
  if (await hasLegacyAdminSession()) {
    return {
      mode: "legacy",
      role: "admin",
      profile: null,
      authUserId: null,
    };
  }

  const staff = await getAuthenticatedStaffProfile();

  if (!staff) {
    return null;
  }

  return {
    mode: "staff",
    role: staff.profile.role,
    profile: staff.profile,
    authUserId: staff.authUserId,
  };
}

export async function requireAdminSession() {
  const context = await getAdminAccessContext();

  if (!context || context.role !== "admin") {
    redirect("/login?error=restricted");
  }

  return context;
}

export async function requireStaffSession(allowedRoles?: StaffRole[]) {
  const staff = await getAuthenticatedStaffProfile();

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
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
}
