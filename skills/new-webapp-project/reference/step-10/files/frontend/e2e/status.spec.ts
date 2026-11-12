import { expect, test } from "@playwright/test";

test("the app loads and shows API ok, Redis ok and Model loaded", async ({ page }) => {
  await page.goto("/");

  const status = page.getByRole("region", { name: "Status" });
  await expect(status.getByLabel("API")).toHaveText("ok");
  await expect(status.getByLabel("Redis")).toHaveText("ok");
  await expect(status.getByLabel("Model")).toHaveText("loaded");
});
