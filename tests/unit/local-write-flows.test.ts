import { randomBytes } from "node:crypto";

import { describe, expect, it } from "vitest";

import {
  createRegistrationCategoryFixture,
  getActiveQrTokenForResource,
  hasLocalDockerDb,
  localSupabase,
} from "../helpers/local-docker-db";

const localDescribe = hasLocalDockerDb && localSupabase ? describe : describe.skip;

localDescribe("local Docker write flows", () => {
  it("register_team_atomic creates the team and its active QR token", async () => {
    const fixture = await createRegistrationCategoryFixture(`ZZ Unit ${Date.now()}`);
    const registrationCode = `UNIT-${randomBytes(2).toString("hex").toUpperCase()}`;
    const qrToken = randomBytes(18).toString("base64url");

    const { data, error } = await localSupabase!.rpc("register_team_atomic", {
      p_category_id: fixture.category.id,
      p_team_name: "ZZ Unit Equipo",
      p_captain_name: "Responsable Unit",
      p_captain_phone: "600123123",
      p_captain_email: `unit-${Date.now()}@torneo.test`,
      p_total_players: 9,
      p_registration_code: registrationCode,
      p_qr_token: qrToken,
    });

    expect(error).toBeNull();
    expect(data?.success).toBe(true);
    expect(data?.deduplicated).toBe(false);
    expect(data?.qr_token).toBe(qrToken);
    expect(typeof data?.team_id).toBe("string");

    const { data: team, error: teamError } = await localSupabase!
      .from("teams")
      .select("id, registration_code, team_name")
      .eq("id", data.team_id)
      .single();

    expect(teamError).toBeNull();
    expect(team?.registration_code).toBe(registrationCode);
    expect(team?.team_name).toBe("ZZ Unit Equipo");

    const token = await getActiveQrTokenForResource("team", data.team_id as string);
    expect(token.token).toBe(qrToken);
  });

  it("register_team_atomic deduplicates repeated submissions and reuses the active QR token", async () => {
    const fixture = await createRegistrationCategoryFixture(`ZZ Idempotent ${Date.now()}`);
    const teamName = "ZZ Equipo Repetido";
    const captainEmail = `repeat-${Date.now()}@torneo.test`;
    const firstRegistrationCode = `ID1-${randomBytes(2).toString("hex").toUpperCase()}`;
    const secondRegistrationCode = `ID2-${randomBytes(2).toString("hex").toUpperCase()}`;
    const firstQrToken = randomBytes(18).toString("base64url");
    const secondQrToken = randomBytes(18).toString("base64url");

    const firstAttempt = await localSupabase!.rpc("register_team_atomic", {
      p_category_id: fixture.category.id,
      p_team_name: teamName,
      p_captain_name: "Responsable Repeat",
      p_captain_phone: "600321321",
      p_captain_email: captainEmail,
      p_total_players: 8,
      p_registration_code: firstRegistrationCode,
      p_qr_token: firstQrToken,
    });

    const secondAttempt = await localSupabase!.rpc("register_team_atomic", {
      p_category_id: fixture.category.id,
      p_team_name: " zz   equipo repetido ",
      p_captain_name: "Responsable Repeat",
      p_captain_phone: "600321321",
      p_captain_email: ` ${captainEmail.toUpperCase()} `,
      p_total_players: 8,
      p_registration_code: secondRegistrationCode,
      p_qr_token: secondQrToken,
    });

    expect(firstAttempt.error).toBeNull();
    expect(secondAttempt.error).toBeNull();
    expect(firstAttempt.data?.success).toBe(true);
    expect(secondAttempt.data?.success).toBe(true);
    expect(firstAttempt.data?.deduplicated).toBe(false);
    expect(secondAttempt.data?.deduplicated).toBe(true);
    expect(secondAttempt.data?.team_id).toBe(firstAttempt.data?.team_id);
    expect(secondAttempt.data?.qr_token).toBe(firstQrToken);

    const { data: teams, error: teamsError } = await localSupabase!
      .from("teams")
      .select("id, registration_code")
      .eq("category_id", fixture.category.id)
      .neq("status", "cancelled");

    expect(teamsError).toBeNull();
    expect(teams).toHaveLength(1);
    expect(teams?.[0]?.registration_code).toBe(firstRegistrationCode);

    const token = await getActiveQrTokenForResource("team", firstAttempt.data?.team_id as string);
    expect(token.token).toBe(firstQrToken);
  });

  it("register_team_atomic allows a fresh registration after the previous one was cancelled", async () => {
    const fixture = await createRegistrationCategoryFixture(`ZZ Cancelled ${Date.now()}`);
    const teamName = "ZZ Equipo Cancelado";
    const captainEmail = `cancelled-${Date.now()}@torneo.test`;
    const firstRegistrationCode = `CN1-${randomBytes(2).toString("hex").toUpperCase()}`;
    const secondRegistrationCode = `CN2-${randomBytes(2).toString("hex").toUpperCase()}`;
    const firstQrToken = randomBytes(18).toString("base64url");
    const secondQrToken = randomBytes(18).toString("base64url");

    const firstAttempt = await localSupabase!.rpc("register_team_atomic", {
      p_category_id: fixture.category.id,
      p_team_name: teamName,
      p_captain_name: "Responsable Cancelled",
      p_captain_phone: "600111111",
      p_captain_email: captainEmail,
      p_total_players: 7,
      p_registration_code: firstRegistrationCode,
      p_qr_token: firstQrToken,
    });

    expect(firstAttempt.error).toBeNull();
    expect(firstAttempt.data?.success).toBe(true);

    const { error: cancelError } = await localSupabase!
      .from("teams")
      .update({ status: "cancelled" })
      .eq("id", firstAttempt.data?.team_id as string);

    expect(cancelError).toBeNull();

    const secondAttempt = await localSupabase!.rpc("register_team_atomic", {
      p_category_id: fixture.category.id,
      p_team_name: teamName,
      p_captain_name: "Responsable Cancelled",
      p_captain_phone: "600111111",
      p_captain_email: captainEmail,
      p_total_players: 7,
      p_registration_code: secondRegistrationCode,
      p_qr_token: secondQrToken,
    });

    expect(secondAttempt.error).toBeNull();
    expect(secondAttempt.data?.success).toBe(true);
    expect(secondAttempt.data?.deduplicated).toBe(false);
    expect(secondAttempt.data?.team_id).not.toBe(firstAttempt.data?.team_id);

    const { data: activeTeams, error: activeTeamsError } = await localSupabase!
      .from("teams")
      .select("id")
      .eq("category_id", fixture.category.id)
      .neq("status", "cancelled");

    expect(activeTeamsError).toBeNull();
    expect(activeTeams).toHaveLength(1);
    expect(activeTeams?.[0]?.id).toBe(secondAttempt.data?.team_id);
  });

  it("register_team_atomic recreates the team QR token when the deduplicated team lost its active QR", async () => {
    const fixture = await createRegistrationCategoryFixture(`ZZ Missing QR ${Date.now()}`);
    const registrationCode = `MQ-${randomBytes(2).toString("hex").toUpperCase()}`;
    const captainEmail = `missing-qr-${Date.now()}@torneo.test`;

    const { data: team, error: teamError } = await localSupabase!
      .from("teams")
      .insert({
        category_id: fixture.category.id,
        team_name: "ZZ Missing QR Team",
        captain_name: "Responsable QR",
        captain_phone: "600888888",
        captain_email: captainEmail,
        total_players: 8,
        registration_code: registrationCode,
        status: "pending",
        gdpr_consent: true,
        regulation_accepted: true,
        parental_confirmation_required: false,
      })
      .select("id")
      .single();

    expect(teamError).toBeNull();

    const regeneratedQrToken = randomBytes(18).toString("base64url");
    const rpcAttempt = await localSupabase!.rpc("register_team_atomic", {
      p_category_id: fixture.category.id,
      p_team_name: " zz  missing qr team ",
      p_captain_name: "Responsable QR",
      p_captain_phone: "600888888",
      p_captain_email: ` ${captainEmail.toUpperCase()} `,
      p_total_players: 8,
      p_registration_code: `MQ2-${randomBytes(2).toString("hex").toUpperCase()}`,
      p_qr_token: regeneratedQrToken,
    });

    expect(rpcAttempt.error).toBeNull();
    expect(rpcAttempt.data?.success).toBe(true);
    expect(rpcAttempt.data?.deduplicated).toBe(true);
    expect(rpcAttempt.data?.team_id).toBe(team?.id);
    expect(rpcAttempt.data?.qr_token).toBe(regeneratedQrToken);

    const token = await getActiveQrTokenForResource("team", team!.id);
    expect(token.token).toBe(regeneratedQrToken);
  });

  it("confirmParentalAuthorization marks the token and team as confirmed", async () => {
    const fixture = await createRegistrationCategoryFixture(`ZZ Parental ${Date.now()}`);
    const confirmationToken = randomBytes(16).toString("hex");
    const teamCode = `PAR-${randomBytes(2).toString("hex").toUpperCase()}`;

    const { data: team, error: teamError } = await localSupabase!
      .from("teams")
      .insert({
        category_id: fixture.category.id,
        team_name: "ZZ Parental Team",
        captain_name: "Tutor Demo",
        captain_phone: "600456456",
        captain_email: `parental-${Date.now()}@torneo.test`,
        total_players: 8,
        registration_code: teamCode,
        status: "pending",
        gdpr_consent: true,
        regulation_accepted: true,
        parental_confirmation_required: true,
      })
      .select("id")
      .single();

    expect(teamError).toBeNull();

    const { error: confirmationError } = await localSupabase!.from("parental_confirmations").insert({
      team_id: team!.id,
      token: confirmationToken,
      child_name: "Jugador Demo",
      status: "pending",
    });

    expect(confirmationError).toBeNull();

    const { confirmParentalAuthorization } = await import("@/lib/supabase/queries");
    const result = await confirmParentalAuthorization({
      token: confirmationToken,
      parentName: "Madre Demo",
      parentPhone: "600999999",
      parentEmail: "madre.demo@torneo.test",
    });

    expect(result.message).toContain("correctamente");

    const { data: confirmation } = await localSupabase!
      .from("parental_confirmations")
      .select("status, confirmed_at, parent_email")
      .eq("token", confirmationToken)
      .single();

    const { data: updatedTeam } = await localSupabase!
      .from("teams")
      .select("status, parental_confirmed_at")
      .eq("id", team!.id)
      .single();
    const token = await getActiveQrTokenForResource("team", team!.id);

    expect(confirmation?.status).toBe("confirmed");
    expect(confirmation?.confirmed_at).toBeTruthy();
    expect(confirmation?.parent_email).toBe("madre.demo@torneo.test");
    expect(updatedTeam?.status).toBe("confirmed");
    expect(updatedTeam?.parental_confirmed_at).toBeTruthy();
    expect(token.resource_id).toBe(team!.id);
  });
});
