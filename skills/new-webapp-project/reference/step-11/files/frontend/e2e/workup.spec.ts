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

  // Only the status panel's readiness check may reach the API, and no request carries the entered values.
  for (const request of apiRequests) {
    expect(`${request.method()} ${new URL(request.url()).pathname}`).toBe("GET /api/v1/readyz");
    expect(request.url() + (request.postData() ?? "")).not.toMatch(/183|312|MSUFAL/);
  }

  await page.reload();
  await expect(name).toHaveValue("MSUFAL016-26");
  await expect(gol).toHaveValue("183");
  await expect(xcb).toHaveValue("312");
  await expect(page.getByText("Not possible: outside 100–200 mm.")).toBeVisible();
});
