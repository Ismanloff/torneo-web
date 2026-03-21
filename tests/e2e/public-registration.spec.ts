import { config as loadEnv } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { expect, test } from "@playwright/test";

loadEnv({ path: process.env.TEST_ENV_FILE || ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY?.trim();

async function getReadOnlySupabase() {
  if (!supabaseUrl || !supabaseSecretKey) {
    return null;
  }

  return createClient(supabaseUrl, supabaseSecretKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

test("public registration flow highlights the cash payment reminder", async ({ page }) => {
  const supabase = await getReadOnlySupabase();

  if (!supabase) {
    test.skip(true, "Supabase no está configurado para tests E2E.");
  }

  const { data: category } = await supabase!
    .from("categories")
    .select("id")
    .eq("is_active", true)
    .order("created_at", { ascending: true })
    .limit(1)
    .single();

  await page.goto("/inscripcion");
  await expect(page.getByText("Aviso importante")).toBeVisible();
  await expect(page.getByText("5 € en efectivo", { exact: true })).toBeVisible();
  await expect(page.getByText("Cada equipo debe abonarlo el día del torneo")).toBeVisible();

  await page.goto(`/inscripcion/${category!.id}`);

  await expect(page.getByText("Importe de participación")).toBeVisible();
  await expect(page.getByText("Pago obligatorio el día del torneo")).toBeVisible();
  await expect(
    page.getByText(
      "Para participar en el torneo, cada equipo debe abonar 5 € en efectivo el día del torneo para cubrir gastos de organización.",
    ),
  ).toBeVisible();
});

test("public success page and QR route preserve the operational payment reminder", async ({ page }) => {
  const supabase = await getReadOnlySupabase();

  if (!supabase) {
    test.skip(true, "Supabase no está configurado para tests E2E.");
  }

  const { data: latestTeam } = await supabase!
    .from("teams")
    .select("id")
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  const { data: latestToken } = await supabase!
    .from("match_qr_tokens")
    .select("token")
    .eq("resource_type", "team")
    .eq("resource_id", latestTeam!.id)
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  await page.goto(`/q/${latestToken!.token}`);
  await expect(page).toHaveURL(new RegExp(`/seguimiento/equipo/${latestTeam!.id}$`));

  await page.goto(`/inscripcion/exito?team=${latestTeam!.id}&token=${latestToken!.token}`);
  await expect(page.getByText("Importe pendiente el día del torneo")).toBeVisible();
  await expect(
    page.getByText(
      "Recuerda: el equipo debe abonar 5 € en efectivo el día del torneo para cubrir gastos de organización.",
    ),
  ).toBeVisible();
  await expect(page.getByRole("img", { name: "QR de acceso" })).toBeVisible();
});
