import { expect, test, type Request } from "@playwright/test";

test("a Workup keeps its name and values in the browser, and typing sends nothing to the API", async ({ page }) => {
  await page.goto("/");
  const name = page.getByRole("textbox", { name: "Workup name" });
  const gol = page.getByRole("textbox", { name: /GOL/ });
  const xcb = page.getByRole("textbox", { name: /XCB/ });
  await expect(gol).toBeVisible();

  // Watch every request from here on, while the user types.
  const apiRequests: Request[] = [];
  page.on("request", (request) => {
    if (new URL(request.url()).pathname.startsWith("/api/")) {
      apiRequests.push(request);
    }
  });

  await name.fill("MSUFAL016-26");
  await gol.pressSequentially("183");
  await xcb.pressSequentially("312");

  await expect(page.getByText("Not possible: outside 100–200 mm.")).toBeVisible();
  await expect(xcb).toHaveAttribute("aria-invalid", "true");

  // Changed in Step 12 (was: only GET readyz). The page now also loads the run log, a GET with the Workup's id, so the
  // rule is: while typing, only GETs, with no body and no query string, so no request can carry the entered values.
  // (The id is random hex, so searching URLs for "183" could match it by chance.)
  for (const request of apiRequests) {
    expect(request.method()).toBe("GET");
    expect(new URL(request.url()).search).toBe("");
    expect(request.postData()).toBeNull();
  }

  await page.reload();
  await expect(name).toHaveValue("MSUFAL016-26");
  await expect(gol).toHaveValue("183");
  await expect(xcb).toHaveValue("312");
  await expect(page.getByText("Not possible: outside 100–200 mm.")).toBeVisible();
});
