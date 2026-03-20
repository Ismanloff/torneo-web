import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { isTrustedMutationRequest } from "@/lib/server-security";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

const pushSubscriptionSchema = z.object({
  endpoint: z
    .string()
    .trim()
    .url()
    .max(2048)
    .refine((value) => value.startsWith("https://"), "Push endpoint must be HTTPS"),
  keys: z.object({
    p256dh: z.string().trim().min(16).max(512),
    auth: z.string().trim().min(8).max(512),
  }),
});

export async function POST(request: NextRequest) {
  try {
    if (!isTrustedMutationRequest(request)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const supabase = await createSupabaseServerClient();
    const claimsResult = await supabase.auth.getClaims();
    const authUserId = claimsResult.data?.claims?.sub;

    if (!authUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = pushSubscriptionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Missing subscription data" },
        { status: 400 },
      );
    }

    const { error } = await supabaseAdmin
      .from("push_subscriptions")
      .upsert(
        {
          staff_user_id: authUserId,
          endpoint: parsed.data.endpoint,
          p256dh: parsed.data.keys.p256dh,
          auth_key: parsed.data.keys.auth,
        },
        { onConflict: "endpoint" },
      );

    if (error) {
      console.error("[push/subscribe] Upsert error:", error.message);
      return NextResponse.json(
        { error: "Failed to save subscription" },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
