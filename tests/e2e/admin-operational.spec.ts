import { createHash } from "node:crypto";

import { expect, test } from "@playwright/test";

test("admin operational tab renders the new journey tools", async ({ page }) => {
  const adminKey = process.env.ADMIN_ACCESS_KEY;

  if (!adminKey) {
    test.skip(true, "ADMIN_ACCESS_KEY no está disponible en el entorno de tests.");
  }

  const adminSession = createHash("sha256").update(adminKey!.trim()).digest("hex");

  await page.context().addCookies([
    {
      name: "torneo_admin_session",
      value: adminSession,
      domain: "localhost",
      path: "/",
      httpOnly: true,
      secure: false,
      sameSite: "Lax",
    },
  ]);

  await page.goto("/app/admin");

  await expect(page).toHaveURL(/\/app\/admin/);
  await expect(page.getByText("Jornada automática")).toBeVisible();
  await expect(page.getByRole("button", { name: "Generar jornada" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Guardar ajustes" })).toBeVisible();

  const previewButton = page.getByRole("button", { name: "Cerrar presentes y previsualizar" });
  await expect(previewButton).toBeVisible();

  if (await previewButton.isEnabled()) {
    await previewButton.click();
    await expect(page.getByRole("dialog", { name: "Previsualización de jornada" })).toBeVisible();
  }
});
