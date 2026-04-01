import { test, expect } from "@playwright/test";

import { login } from "./helpers";

test("main modules are reachable from grouped navigation", async ({ page }) => {
  await login(page);

  const sidebar = page.locator(".sidebar");
  await expect(sidebar.locator(".nav-group-title", { hasText: "Painel" })).toBeVisible();
  await expect(sidebar.locator(".nav-group-title", { hasText: "Fluxo comercial" })).toBeVisible();
  await expect(sidebar.locator(".nav-group-title", { hasText: "Entrega" })).toBeVisible();
  await expect(sidebar.locator(".nav-group-title", { hasText: "Governança" })).toBeVisible();

  await page.getByRole("button", { name: /Empresas/i }).click();
  await expect(page.locator(".topbar h2")).toHaveText("Empresas");

  await page.getByRole("button", { name: /Oportunidades/i }).click();
  await expect(page.locator(".topbar h2")).toHaveText("Oportunidades");

  await page.getByRole("button", { name: /Projetos/i }).click();
  await expect(page.locator(".topbar h2")).toHaveText("Projetos");
});
