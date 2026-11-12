import { execFileSync } from "node:child_process";

import { expect, test } from "@playwright/test";

// The API keeps no state of its own: every replica answers from the shared Redis. Runs only against a cluster, where
// it asks each api pod directly instead of hoping the Service spreads the requests. E2E_KUBECTL is the kubectl command
// for that cluster and namespace (changed in Step 16, was E2E_K8S_NAMESPACE with the orbstack context built in, so the
// test also runs on NCSA): `make test-e2e-k8s` and `make test-e2e-ncsa` set it.
const kubectlCommand = process.env.E2E_KUBECTL?.split(/\s+/);
test.skip(!kubectlCommand, "set E2E_KUBECTL to check the api replicas on a cluster");

const kubectl = (...args: string[]) =>
  execFileSync(kubectlCommand![0], [...kubectlCommand!.slice(1), ...args], { encoding: "utf8" });

test("every api replica shows the same run log", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("textbox", { name: /GOL/ }).fill("183");
  await page.getByRole("textbox", { name: /XCB/ }).fill("140");
  await page.getByRole("button", { name: "Analyze" }).click();
  await expect(page.getByRole("list", { name: "Run log" }).getByRole("listitem")).toHaveCount(1);
  const workupId = await page.evaluate(() => JSON.parse(localStorage.getItem("mosaic:workup")!).id as string);

  const pods = kubectl("get", "pods", "-l", "app=api", "-o", "jsonpath={.items[*].metadata.name}").split(" ");
  expect(pods).toHaveLength(2);

  const url = `http://localhost:8000/api/v1/workups/${workupId}/analyses`;
  const runLogs = pods.map((pod) =>
    JSON.parse(
      kubectl(
        "exec",
        pod,
        "--",
        "python",
        "-c",
        `import urllib.request; print(urllib.request.urlopen("${url}").read().decode())`,
      ),
    ),
  );
  expect(runLogs[0]).toHaveLength(1);
  expect(runLogs[1]).toEqual(runLogs[0]);
});
