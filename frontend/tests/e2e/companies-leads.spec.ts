import { test, expect } from "@playwright/test";

import { login } from "./helpers";

test("companies and leads smoke keep the crm surfaces reachable", async ({ page }) => {
  await login(page);

  await page.getByRole("button", { name: /Empresas/i }).click();
  await expect(page.locator(".topbar h2")).toHaveText("Empresas");
  await expect(page.locator(".page-grid .section-heading h3").first()).toHaveText("Empresas");
  await expect(page.getByText("Use a lista para abrir uma conta")).toBeVisible();
  await expect(page.locator(".crm-summary-grid")).toBeVisible();

  const companyRows = page.locator("tbody tr");
  if ((await companyRows.count()) > 0) {
    await companyRows.first().click();
    await expect(page.getByText("Conta em foco")).toBeVisible();
  }

  await page.getByRole("button", { name: /Leads/i }).click();
  await expect(page.locator(".topbar h2")).toHaveText("Leads");
  await expect(page.locator(".page-grid .section-heading h3").first()).toHaveText("Leads");
  await expect(page.getByText("Trabalhe o lead pela lista")).toBeVisible();
  await expect(page.locator(".crm-summary-grid")).toBeVisible();

  const leadRows = page.locator("tbody tr");
  if ((await leadRows.count()) > 0) {
    await leadRows.first().click();
    await expect(page.getByText("Registro em foco")).toBeVisible();
  }
});
