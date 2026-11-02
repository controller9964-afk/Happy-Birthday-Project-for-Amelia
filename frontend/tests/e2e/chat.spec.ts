import { expect, test } from "@playwright/test";

test("a visitor saves a message locally and can delete it", async ({ page }) => {
  await page.goto("/chat");
  await page.getByLabel("Choose a nickname").fill("Story Friend");
  await page.getByRole("button", { name: /join the room/i }).click();

  const composer = page.getByLabel("Your message");
  await composer.fill("Happy birthday, Amelia! 🎂");
  await composer.press("Enter");
  await expect(page.getByText("Happy birthday, Amelia! 🎂")).toBeVisible();
  await expect(page.getByText("Saved only in this browser", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Delete message from Story Friend" }).click();
  await expect(page.getByText("Happy birthday, Amelia! 🎂")).toHaveCount(0);
});
