import { execFileSync } from "node:child_process";

import { expect, test } from "@playwright/test";

// The API keeps no state of its own: every replica answers from the shared Redis. Runs only against Kubernetes
// (`make test-e2e-k8s` sets E2E_K8S_NAMESPACE), where it asks each api pod directly instead of hoping the Service
// spreads the requests.
const namespace = process.env.E2E_K8S_NAMESPACE;
test.skip(!namespace, "set E2E_K8S_NAMESPACE to check the api replicas on Kubernetes");

const kubectl = (...args: string[]) =>
  execFileSync("kubectl", ["--context", "orbstack", "-n", namespace!, ...args], { encoding: "utf8" });

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
