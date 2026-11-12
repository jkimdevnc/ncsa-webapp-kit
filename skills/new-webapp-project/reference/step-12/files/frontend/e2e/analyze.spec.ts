import { expect, test, type Request } from "@playwright/test";

// The main regression flow: enter → Analyze → result → run log, with the values sent once, in the Analyze request.
test("Analyze sends the values once and shows the result and the run log", async ({ page }) => {
  const requests: Request[] = [];
  page.on("request", (request) => {
    if (new URL(request.url()).pathname.startsWith("/api/")) {
      requests.push(request);
    }
  });

  await page.goto("/");
  await page.getByRole("textbox", { name: /GOL/ }).fill("183");
  await page.getByRole("textbox", { name: /XCB/ }).fill("140");
  await page.getByRole("textbox", { name: /NOL/ }).fill("180");

  const analyze = page.getByRole("button", { name: "Analyze" });
  await analyze.click();

  const result = page.getByRole("region", { name: "Result" });
  await expect(result).toContainText("mesocranic");
  await expect(result).toContainText("76.5");
  const runs = page.getByRole("list", { name: "Run log" }).getByRole("listitem");
  await expect(runs).toHaveCount(1);

  await analyze.click();
  await expect(runs).toHaveCount(2);

  // Values can travel only in a body or a query string: only the two Analyze POSTs have a body, and it holds the
  // Workup's id and exactly the model's inputs (not NOL). No request has a query string.
  const workupId = await page.evaluate(() => JSON.parse(localStorage.getItem("mosaic:workup")!).id);
  const posts = requests.filter((r) => r.method() === "POST");
  expect(posts.map((r) => new URL(r.url()).pathname)).toEqual(["/api/v1/analyses", "/api/v1/analyses"]);
  for (const post of posts) {
    expect(post.postDataJSON()).toEqual({
      workup_id: workupId,
      model_id: "cranial-demo",
      values: { GOL: 183, XCB: 140 },
    });
  }
  for (const request of requests) {
    expect(new URL(request.url()).search).toBe("");
    if (request.method() !== "POST") {
      expect(request.postData()).toBeNull();
    }
  }
});

test("Analyze stays disabled while a value is out of range", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("textbox", { name: /GOL/ }).fill("183");
  await page.getByRole("textbox", { name: /XCB/ }).fill("312");

  await expect(page.getByRole("button", { name: "Analyze" })).toBeDisabled();
});
