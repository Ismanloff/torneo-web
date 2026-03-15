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
  captainPhone: z.string().trim().min(6).max(20),
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

  const { count: activeTeamCount, error: teamCountError } = await supabaseAdmin
    .from("teams")
    .select("id", { count: "exact", head: true })
    .eq("category_id", parsed.data.categoryId)
    .neq("status", "cancelled");

  if (teamCountError) {
    console.error("registerTeamAction team count error", teamCountError);
    redirect(`/inscripcion/${parsed.data.categoryId}?error=registro`);
  }

  if ((activeTeamCount ?? 0) >= category.max_teams) {
    redirect(`/inscripcion/${parsed.data.categoryId}?error=registro`);
  }

  const suffix = randomBytes(2).toString("hex").toUpperCase();
  const registrationCode = `${slugToCode(parsed.data.teamName)}-${suffix}`;

  const { data: team, error: teamError } = await supabaseAdmin
    .from("teams")
    .insert({
      category_id: parsed.data.categoryId,
      team_name: parsed.data.teamName,
      captain_name: parsed.data.captainName,
      captain_phone: parsed.data.captainPhone,
      captain_email: parsed.data.captainEmail,
      total_players: parsed.data.totalPlayers,
      registration_code: registrationCode,
      status: "pending",
      gdpr_consent: true,
      regulation_accepted: true,
      parental_confirmation_required: false,
    })
    .select("id")
    .single();

  if (teamError || !team) {
    console.error("registerTeamAction team insert error", teamError);
    redirect(`/inscripcion/${parsed.data.categoryId}?error=registro`);
  }

  const qrToken = randomBytes(18).toString("base64url");

  const { error: qrError } = await supabaseAdmin
    .from("match_qr_tokens")
    .insert({
      token: qrToken,
      resource_type: "team",
      resource_id: team.id,
      is_active: true,
    });

  if (qrError) {
    console.error("registerTeamAction qr insert error", qrError);
    redirect(`/inscripcion/${parsed.data.categoryId}?error=registro`);
  }

  const emailResult = await sendRegistrationEmail({
    to: parsed.data.captainEmail,
    teamId: team.id,
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
