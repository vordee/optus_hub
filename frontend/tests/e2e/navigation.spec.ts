import { test, expect } from "@playwright/test";

import { login } from "./helpers";

test("main modules are reachable from grouped navigation", async ({ page }) => {
  await login(page);

  const sidebar = page.locator(".sidebar");
  await expect(sidebar.locator(".nav-group-title", { hasText: "Visão Geral" })).toBeVisible();
  await expect(sidebar.locator(".nav-group-title", { hasText: "Administração" })).toBeVisible();
  await expect(sidebar.locator(".nav-group-title", { hasText: "CRM" })).toBeVisible();
  await expect(sidebar.locator(".nav-group-title", { hasText: "Operação" })).toBeVisible();

  await page.getByRole("button", { name: /Empresas/i }).click();
  await expect(page.locator(".topbar h2")).toHaveText("Empresas");

  await page.getByRole("button", { name: /Oportunidades/i }).click();
  await expect(page.locator(".topbar h2")).toHaveText("Oportunidades");

  await page.getByRole("button", { name: /Projetos/i }).click();
  await expect(page.locator(".topbar h2")).toHaveText("Projetos");
});
