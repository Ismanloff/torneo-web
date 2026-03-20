import { NextResponse } from "next/server";
import { z } from "zod";

import { isTrustedMutationRequest } from "@/lib/server-security";
import {
  assertRateLimitAllowed,
  registerRateLimitAttempt,
} from "@/lib/staff-auth";
import { confirmParentalAuthorization } from "@/lib/supabase/queries";

const confirmationSchema = z.object({
  token: z.string().trim().min(12).max(128),
  parentName: z.string().trim().min(3).max(80),
  parentPhone: z
    .string()
    .trim()
    .min(8)
    .max(30)
    .regex(/^\+?[\d\s\-\(\)]{8,30}$/, "Teléfono inválido"),
  parentEmail: z.string().trim().email().max(120),
});

const parentalConfirmationRateLimit = {
  maxAttempts: 10,
  windowMs: 30 * 60 * 1000,
  lockWindowMs: 30 * 60 * 1000,
} as const;

export async function POST(request: Request) {
  try {
    if (!isTrustedMutationRequest(request)) {
      return NextResponse.json({ error: "Origen no permitido." }, { status: 403 });
    }

    const throttle = await assertRateLimitAllowed(
      "public-parental-confirmation",
      parentalConfirmationRateLimit,
    );

    if (!throttle.allowed) {
      return NextResponse.json(
        { error: "Demasiados intentos. Espera unos minutos antes de volver a probar." },
        { status: 429 },
      );
    }

    const body = await request.json();
    const parsed = confirmationSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Hay campos invalidos en la autorizacion.",
          fields: parsed.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    await registerRateLimitAttempt(
      throttle.attemptKey,
      parentalConfirmationRateLimit,
    );
    const result = await confirmParentalAuthorization(parsed.data);
    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "No se pudo completar la autorizacion.";

    return NextResponse.json({ error: message }, { status: 400 });
  }
}
