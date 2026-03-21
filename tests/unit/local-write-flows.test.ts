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
