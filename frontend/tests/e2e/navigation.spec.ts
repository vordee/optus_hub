import { test, expect } from "@playwright/test";

import { login } from "./helpers";

test("main modules are reachable from grouped navigation", async ({ page }) => {
  await login(page);

  await expect(page.getByText("Visão Geral")).toBeVisible();
  await expect(page.getByText("Administração")).toBeVisible();
  await expect(page.getByText("CRM")).toBeVisible();
  await expect(page.getByText("Operação")).toBeVisible();

  await page.getByRole("button", { name: /Empresas/i }).click();
  await expect(page.getByRole("heading", { name: "Empresas" })).toBeVisible();

  await page.getByRole("button", { name: /Oportunidades/i }).click();
  await expect(page.getByRole("heading", { name: "Oportunidades" })).toBeVisible();

  await page.getByRole("button", { name: /Projetos/i }).click();
  await expect(page.getByRole("heading", { name: "Projetos" })).toBeVisible();
});
