import { test, expect } from "@playwright/test";

import { login } from "./helpers";

test("companies and leads smoke keep the crm surfaces reachable", async ({ page }) => {
  await login(page);

  await page.getByRole("button", { name: /Empresas/i }).click();
  await expect(page.locator(".topbar h2")).toHaveText("Empresas");
  await expect(page.locator(".page-grid .section-heading h3").first()).toHaveText("Empresas");
  await expect(page.locator(".crm-summary-grid")).toBeVisible();

  const companyRows = page.locator("tbody tr");
  if ((await companyRows.count()) > 0) {
    await companyRows.first().click();
    await expect(page.getByText("Painel da conta")).toBeVisible();
  }

  await page.getByRole("button", { name: /Leads/i }).click();
  await expect(page.locator(".topbar h2")).toHaveText("Leads");
  await expect(page.locator(".crm-console .workspace-header h3").first()).toHaveText("Leads");
  await expect(page.locator(".workspace-stat-strip")).toBeVisible();
  await expect(page.locator(".record-list")).toBeVisible();

  const leadRows = page.locator(".record-list-item");
  if ((await leadRows.count()) > 0) {
    await leadRows.first().click();
    await expect(page.getByText("Painel do lead")).toBeVisible();
  }
});
