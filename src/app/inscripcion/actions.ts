"use server";

import { randomBytes } from "node:crypto";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { supabaseAdmin } from "@/lib/supabase/admin";
import { sendRegistrationEmail } from "@/lib/email";
import { slugToCode } from "@/lib/utils";

const registrationSchema = z.object({
  categoryId: z.uuid(),
  teamName: z.string().trim().min(3).max(80),
  captainName: z.string().trim().min(2).max(120),
  captainPhone: z.string().trim().min(6).max(20).regex(/^\+?[\d\s\-\(\)]{6,20}$/, "Teléfono inválido"),
  captainEmail: z.string().trim().email().max(120),
  totalPlayers: z.coerce.number().int().min(1).max(30),
  gdprConsent: z.literal("on"),
  regulationAccepted: z.literal("on"),
});

export async function registerTeamAction(formData: FormData) {
  const parsed = registrationSchema.safeParse({
    categoryId: formData.get("categoryId"),
    teamName: formData.get("teamName"),
    captainName: formData.get("captainName"),
    captainPhone: formData.get("captainPhone"),
    captainEmail: formData.get("captainEmail"),
    totalPlayers: formData.get("totalPlayers"),
    gdprConsent: formData.get("gdprConsent"),
    regulationAccepted: formData.get("regulationAccepted"),
  });

  if (!parsed.success) {
    redirect(`/inscripcion/${formData.get("categoryId") ?? ""}?error=registro`);
  }

  const { data: category, error: categoryError } = await supabaseAdmin
    .from("categories")
    .select("*")
    .eq("id", parsed.data.categoryId)
    .eq("is_active", true)
    .single();

  if (categoryError || !category) {
    redirect(`/inscripcion/${parsed.data.categoryId}?error=registro`);
  }

  const suffix = randomBytes(2).toString("hex").toUpperCase();
  const registrationCode = `${slugToCode(parsed.data.teamName)}-${suffix}`;
  const qrToken = randomBytes(18).toString("base64url");

  // Atomic check-and-insert via DB function to prevent race conditions
  const { data: rpcResult, error: rpcError } = await supabaseAdmin.rpc(
    "register_team_atomic",
    {
      p_category_id: parsed.data.categoryId,
      p_team_name: parsed.data.teamName,
      p_captain_name: parsed.data.captainName,
      p_captain_phone: parsed.data.captainPhone,
      p_captain_email: parsed.data.captainEmail,
      p_total_players: parsed.data.totalPlayers,
      p_registration_code: registrationCode,
      p_qr_token: qrToken,
    },
  );

  if (rpcError || !rpcResult?.success) {
    console.error("registerTeamAction rpc error", rpcError ?? rpcResult?.error);
    redirect(`/inscripcion/${parsed.data.categoryId}?error=registro`);
  }

  const teamId = rpcResult.team_id as string;

  const emailResult = await sendRegistrationEmail({
    to: parsed.data.captainEmail,
    teamId,
    teamName: parsed.data.teamName,
    categoryName: category.name,
    sport: category.sport,
    ageGroup: category.age_group,
    schoolName: category.school,
    registrationCode,
    qrToken,
    captainName: parsed.data.captainName,
  });

  if (emailResult.status !== "sent") {
    console.warn("registerTeamAction email unavailable", {
      registrationCode,
      status: emailResult.status,
      reason: emailResult.error,
    });
  }

  const emailStatus = emailResult.status === "sent" ? "sent" : emailResult.status;

  revalidatePath("/");
  revalidatePath("/inscripcion");
  redirect(`/inscripcion/exito?code=${registrationCode}&email=${emailStatus}`);
}
