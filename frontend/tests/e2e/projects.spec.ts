import { test, expect } from "@playwright/test";

import { login } from "./helpers";

test("projects page shows operational sections", async ({ page }) => {
  await login(page);

  await page.getByRole("button", { name: /Projetos/i }).click();
  await expect(page.locator(".topbar h2")).toHaveText("Projetos");
  await expect(page.getByText("Fluxo sugerido")).toBeVisible();

  const rows = page.locator("tbody tr");
  const rowCount = await rows.count();

  if (rowCount > 0) {
    await rows.first().click();
    await expect(page.getByText("Mapa operacional")).toBeVisible();
    await expect(page.getByText("Execução do projeto")).toBeVisible();
  }
});
