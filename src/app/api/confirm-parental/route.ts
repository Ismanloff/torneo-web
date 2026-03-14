import { NextResponse } from "next/server";
import { z } from "zod";

import { confirmParentalAuthorization } from "@/lib/supabase/queries";

const confirmationSchema = z.object({
  token: z.string().trim().min(12).max(128),
  parentName: z.string().trim().min(3).max(80),
  parentPhone: z.string().trim().min(8).max(30),
  parentEmail: z.email().max(120),
});

export async function POST(request: Request) {
  try {
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

    const result = await confirmParentalAuthorization(parsed.data);
    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "No se pudo completar la autorizacion.";

    return NextResponse.json({ error: message }, { status: 400 });
  }
}
