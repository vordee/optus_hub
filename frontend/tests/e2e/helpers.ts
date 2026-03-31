import { expect, type Page } from "@playwright/test";

export function getE2ECredentials() {
  const email = process.env.E2E_EMAIL;
  const password = process.env.E2E_PASSWORD;

  if (!email || !password) {
    throw new Error("Set E2E_EMAIL and E2E_PASSWORD before running Playwright.");
  }

  return { email, password };
}

export async function login(page: Page) {
  const { email, password } = getE2ECredentials();

  await page.goto("/");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Senha").fill(password);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page.getByText("Módulo ativo")).toBeVisible();
}
