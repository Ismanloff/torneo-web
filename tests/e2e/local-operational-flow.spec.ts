import { expect, test } from "@playwright/test";

import {
  buildLegacyAdminSessionValue,
  createOperationalScenario,
  createRegistrationCategoryFixture,
  getActiveQrTokenForResource,
  getCategoryMatches,
  getTeamByCaptainEmail,
  getTeamCheckin,
  hasLocalDockerDb,
  localSupabase,
  type OperationalScenario,
} from "../helpers/local-docker-db";

test.describe.serial("local docker tournament roundtrip", () => {
  test.skip(!hasLocalDockerDb || !localSupabase, "Requires the local Docker Supabase replica.");
  test.setTimeout(120_000);

  const runId = Date.now();
  const prefix = `ZZ E2E ${runId}`;

  let registrationCategory: Awaited<ReturnType<typeof createRegistrationCategoryFixture>>;
  let operationalScenario: OperationalScenario;

  test.beforeAll(async () => {
    registrationCategory = await createRegistrationCategoryFixture(`${prefix} Registro`);
    operationalScenario = await createOperationalScenario(`${prefix} Operativa`);
  });

  test("public registration submits, creates QR and opens the public follow-up", async ({ page }) => {
    const captainEmail = `registro-${runId}@torneo.test`;

    await page.goto(`/inscripcion/${registrationCategory.category.id}`);

    await page.getByLabel("Nombre del equipo").fill(`${prefix} Inscrito`);
    await page.getByLabel("Nombre del responsable").fill("Coordinador Demo");
    await page.getByLabel("Correo electronico").fill(captainEmail);
    await page.getByLabel("Telefono").fill("600123987");
    await page.getByLabel("Numero de jugadores").fill("9");
    await page.getByText("Acepto el tratamiento de datos personales").click();
    await page.getByText("Acepto el reglamento del torneo").click();
    await page.getByRole("button", { name: "Inscribir equipo" }).click();

    await expect(page).toHaveURL(/\/inscripcion\/exito/);
    await expect(page.getByText("Importe pendiente el día del torneo")).toBeVisible();
    await expect(page.getByText("Correo no disponible")).toBeVisible();

    const createdTeam = await getTeamByCaptainEmail(captainEmail);
    const teamToken = await getActiveQrTokenForResource("team", createdTeam.id);

    await expect(page.getByText(createdTeam.registration_code)).toBeVisible();
    await page.goto(`/q/${teamToken.token}`);
    await expect(page).toHaveURL(new RegExp(`/seguimiento/equipo/${createdTeam.id}$`));

    const refreshedToken = await getActiveQrTokenForResource("team", createdTeam.id);
    expect(refreshedToken.last_used_at).toBeTruthy();
  });

  test("admin generates the operational schedule from the panel", async ({ page }) => {
    await page.context().addCookies([
      {
        name: "torneo_admin_session",
        value: buildLegacyAdminSessionValue(),
        domain: "localhost",
        path: "/",
        httpOnly: true,
        secure: false,
        sameSite: "Lax",
      },
    ]);

    await page.goto("/app/admin");
    await page.locator("#admin-category-selector").selectOption(operationalScenario.category.id);

    await expect(page.getByText("4 llegadas confirmadas")).toBeVisible();
    await page.getByRole("button", { name: "Cerrar presentes y previsualizar" }).click();
    const previewDialog = page.getByRole("dialog", { name: "Previsualización de jornada" });
    await expect(previewDialog).toBeVisible();
    await previewDialog.getByRole("button", { name: "Cerrar", exact: true }).click();

    await page.getByRole("button", { name: "Generar jornada" }).click();
    await expect
      .poll(async () => (await getCategoryMatches(operationalScenario.category.id)).length)
      .toBeGreaterThan(0);

    const matches = await getCategoryMatches(operationalScenario.category.id);
    expect(matches.length).toBeGreaterThan(0);
  });

  test("assistant can log in, open a team by QR and record check-in", async ({ page }) => {
    const matches = await getCategoryMatches(operationalScenario.category.id);
    expect(matches.length).toBeGreaterThan(0);

    const targetMatch = matches[0];
    const homeTeamToken = operationalScenario.teams.find((team) => team.id === targetMatch.home_team_id)?.qrToken;
    expect(homeTeamToken).toBeTruthy();

    await page.goto("/login");
    for (const [index, digit] of operationalScenario.assistant.pin.split("").entries()) {
      await page.getByLabel(`Dígito ${index + 1} de 6`).fill(digit);
    }

    await expect(page).toHaveURL(/\/app$/);
    await page.goto(`/q/${homeTeamToken!}`);
    await expect(page).toHaveURL(new RegExp(`/app/equipo/${targetMatch.home_team_id}.*from=scan`));

    await page.goto(`/app/partido/${targetMatch.id}?scope=category_match`);
    await page.locator('select[name="status"]').first().selectOption("presentado");
    await page.getByRole("button", { name: "Guardar check-in" }).first().click();
    await expect
      .poll(async () => (await getTeamCheckin("category_match", targetMatch.id, targetMatch.home_team_id))?.status ?? null)
      .toBe("presentado");

    const checkin = await getTeamCheckin("category_match", targetMatch.id, targetMatch.home_team_id);
    expect(checkin?.status).toBe("presentado");
    expect(checkin?.checked_in_by_user_id).toBe(operationalScenario.assistant.authUserId);
    await expect(page.getByText("Presentado").first()).toBeVisible();
  });

  test("referee can log in and submit the final score", async ({ page }) => {
    const matches = await getCategoryMatches(operationalScenario.category.id);
    expect(matches.length).toBeGreaterThan(0);

    const targetMatch = matches[0];
    const homeTeam = operationalScenario.teams.find((team) => team.id === targetMatch.home_team_id);
    const awayTeam = operationalScenario.teams.find((team) => team.id === targetMatch.away_team_id);

    expect(homeTeam).toBeTruthy();
    expect(awayTeam).toBeTruthy();

    await page.goto("/login");
    for (const [index, digit] of operationalScenario.referee.pin.split("").entries()) {
      await page.getByLabel(`Dígito ${index + 1} de 6`).fill(digit);
    }

    await expect(page).toHaveURL(/\/app$/);
    await page.goto(`/app/partido/${targetMatch.id}?scope=category_match`);
    await page.locator('select[name="status"]').first().selectOption("completed");
    await page.getByLabel(homeTeam!.team_name).fill("2");
    await page.getByLabel(awayTeam!.team_name).fill("1");
    await page.getByRole("button", { name: "Guardar resultado" }).click();
    await expect
      .poll(async () => {
        const { data } = await localSupabase!
          .from("category_matches")
          .select("status")
          .eq("id", targetMatch.id)
          .single();

        return data?.status ?? null;
      })
      .toBe("completed");

    const { data: updatedMatch, error } = await localSupabase!
      .from("category_matches")
      .select("status, home_score, away_score")
      .eq("id", targetMatch.id)
      .single();

    expect(error).toBeNull();
    expect(updatedMatch?.status).toBe("completed");
    expect(updatedMatch?.home_score).toBe(2);
    expect(updatedMatch?.away_score).toBe(1);
    await expect(page.locator("div").filter({ hasText: /Estado del partido:\s*Finalizado/ }).first()).toBeVisible();
  });
});
