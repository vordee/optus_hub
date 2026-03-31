import { test, expect } from "@playwright/test";

import { login } from "./helpers";

test("projects page shows operational sections", async ({ page }) => {
  await login(page);

  await page.getByRole("button", { name: /Projetos/i }).click();
  await expect(page.locator(".topbar h2")).toHaveText("Projetos");
  await expect(page.getByText("Cockpit")).toBeVisible();
  await expect(page.locator(".panel-switcher").getByRole("button", { name: "Visão", exact: true })).toBeVisible();

  const rows = page.locator("tbody tr");
  const rowCount = await rows.count();

  if (rowCount > 0) {
    await rows.first().click();
    await expect(page.getByText("Situação atual")).toBeVisible();
    await page.locator(".panel-switcher").getByRole("button", { name: "Fases", exact: true }).click();
    await expect(page.getByText("Mapa operacional")).toBeVisible();
    await page.locator(".panel-switcher").getByRole("button", { name: "Tarefas", exact: true }).click();
    await expect(page.getByText("Execução do projeto")).toBeVisible();
  }
});
