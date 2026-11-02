import { expect, test } from "@playwright/test";

test("the chat explains that shared service configuration is required", async ({ page }) => {
  await page.goto("/chat");
  await page.getByLabel("Choose a nickname").fill("Story Friend");
  await page.getByRole("button", { name: /join the room/i }).click();
  await expect(page.getByText(/shared chat is not configured yet/i)).toBeVisible();
  await expect(page.getByLabel("Choose a nickname")).toHaveValue("Story Friend");
});
