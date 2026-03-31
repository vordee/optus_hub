import { test, expect } from "@playwright/test";

import { login } from "./helpers";

test("login and dashboard smoke", async ({ page }) => {
  await login(page);

  await expect(page.getByRole("heading", { name: "Visão geral" })).toBeVisible();
  await expect(page.getByText("Optus Hub")).toBeVisible();
});
