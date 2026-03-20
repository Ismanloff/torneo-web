import "server-only";

import { cookies } from "next/headers";

import { shouldUseSecureCookies } from "@/lib/server-security";
import type { MatchScope } from "@/lib/types";

const STAFF_CREATION_FLASH_COOKIE = "torneo_staff_creation_flash";
const REGISTRATION_FLASH_COOKIE = "torneo_registration_flash";
const PUBLIC_ACCESS_COOKIE = "torneo_public_access";

type PublicResourceType = MatchScope | "team";

export type StaffCreationFlash = {
  pin: string;
  staffName: string;
  issuedAt: string;
};

export type RegistrationSuccessFlash = {
  teamId: string;
  token: string;
  emailStatus: "sent" | "failed" | "skipped";
  issuedAt: string;
};

type PublicAccessState = {
  resourceId: string;
  resourceType: PublicResourceType;
  token: string;
  issuedAt: string;
};

function buildCookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    sameSite: "strict" as const,
    secure: shouldUseSecureCookies(),
    path: "/",
    maxAge,
    priority: "high" as const,
  };
}

function encodeValue(value: unknown) {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

function decodeValue<T>(value: string): T | null {
  try {
    return JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as T;
  } catch {
    return null;
  }
}

async function setEncodedCookie(name: string, value: unknown, maxAge: number) {
  const store = await cookies();
  store.set(name, encodeValue(value), buildCookieOptions(maxAge));
}

async function getDecodedCookie<T>(name: string) {
  const store = await cookies();
  const encoded = store.get(name)?.value;

  if (!encoded) {
    return null;
  }

  return decodeValue<T>(encoded);
}

async function clearCookie(name: string) {
  const store = await cookies();
  store.set(name, "", buildCookieOptions(0));
}

export async function setStaffCreationFlash(payload: Omit<StaffCreationFlash, "issuedAt">) {
  await setEncodedCookie(
    STAFF_CREATION_FLASH_COOKIE,
    {
      ...payload,
      issuedAt: new Date().toISOString(),
    } satisfies StaffCreationFlash,
    60 * 10,
  );
}

export async function getStaffCreationFlash() {
  return getDecodedCookie<StaffCreationFlash>(STAFF_CREATION_FLASH_COOKIE);
}

export async function clearStaffCreationFlash() {
  await clearCookie(STAFF_CREATION_FLASH_COOKIE);
}

export async function setRegistrationSuccessFlash(
  payload: Omit<RegistrationSuccessFlash, "issuedAt">,
) {
  await setEncodedCookie(
    REGISTRATION_FLASH_COOKIE,
    {
      ...payload,
      issuedAt: new Date().toISOString(),
    } satisfies RegistrationSuccessFlash,
    60 * 30,
  );
}

export async function getRegistrationSuccessFlash() {
  return getDecodedCookie<RegistrationSuccessFlash>(REGISTRATION_FLASH_COOKIE);
}

export async function clearRegistrationSuccessFlash() {
  await clearCookie(REGISTRATION_FLASH_COOKIE);
}

export async function setPublicAccessState(payload: {
  resourceId: string;
  resourceType: PublicResourceType;
  token: string;
}) {
  await setEncodedCookie(
    PUBLIC_ACCESS_COOKIE,
    {
      ...payload,
      issuedAt: new Date().toISOString(),
    } satisfies PublicAccessState,
    60 * 60 * 24 * 30,
  );
}

export async function getPublicAccessToken(input: {
  resourceId: string;
  resourceType: PublicResourceType;
}) {
  const state = await getDecodedCookie<PublicAccessState>(PUBLIC_ACCESS_COOKIE);

  if (
    !state ||
    state.resourceId !== input.resourceId ||
    state.resourceType !== input.resourceType
  ) {
    return null;
  }

  return state.token;
}

export async function clearPublicAccessState() {
  await clearCookie(PUBLIC_ACCESS_COOKIE);
}
