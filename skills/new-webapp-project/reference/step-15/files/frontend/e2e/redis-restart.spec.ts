import { execSync } from "node:child_process";

import { expect, test } from "@playwright/test";

// Restarting Redis wipes every result, so this runs only against a stack it may restart. E2E_RESTART_REDIS is the
// command that restarts this stack's Redis and returns once it's back (changed in Step 15, was a flag: it now also
// works on Kubernetes): `make test-e2e-local-stack` and the CI `stack` job restart the Compose service, and `make
// test-e2e-k8s` deletes the Redis pod.
const restartRedis = process.env.E2E_RESTART_REDIS;
test.skip(!restartRedis, "set E2E_RESTART_REDIS to the command that restarts this stack's Redis");

test("after a Redis restart the run log is empty, and the Workup is still in the browser", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("textbox", { name: "Workup name" }).fill("Restart check");
  await page.getByRole("textbox", { name: /GOL/ }).fill("183");
  await page.getByRole("textbox", { name: /XCB/ }).fill("140");
  await page.getByRole("button", { name: "Analyze" }).click();
  const runs = page.getByRole("list", { name: "Run log" }).getByRole("listitem");
  await expect(runs).toHaveCount(1);

  // Redis keeps nothing on disk (docs/decisions/0001), so a restart loses every result.
  execSync(restartRedis!, { cwd: "..", stdio: "ignore" });
  await page.reload();

  await expect(page.getByText("No runs yet.")).toBeVisible();
  await expect(page.getByRole("textbox", { name: "Workup name" })).toHaveValue("Restart check");
  await expect(page.getByRole("textbox", { name: /GOL/ })).toHaveValue("183");
  await expect(page.getByRole("textbox", { name: /XCB/ })).toHaveValue("140");
});
