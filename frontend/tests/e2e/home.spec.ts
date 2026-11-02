import { expect, test } from "@playwright/test";

test("the initial welcome screen progresses from 1% to 100%", async ({ page }) => {
  await page.goto("/");
  const progress = page.getByRole("progressbar", { name: "Loading the birthday experience" });
  await expect(progress).toHaveAttribute("aria-valuemin", "1");
  await expect(progress).toHaveAttribute("aria-valuemax", "100");
  await expect(progress).toHaveAttribute("aria-valuenow", "1");
  await expect(progress).toHaveAttribute("aria-valuenow", "100", { timeout: 3000 });
});

test("the initial welcome screen can be skipped", async ({ page }) => {
  await page.goto("/");
  const progress = page.getByRole("progressbar", { name: "Loading the birthday experience" });
  await expect(page.getByRole("button", { name: "Skip intro" })).toBeVisible();
  await page.getByRole("button", { name: "Skip intro" }).click();
  await expect(progress).toHaveCount(0);
});

test("the birthday home page introduces Amelia's celebration", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /a little place for amelia/i })).toBeVisible();
  await expect(page.getByRole("link", { name: /visit the cozy corner/i })).toBeVisible();
});

test("the birthday surprise reveals a handful of wishes", async ({ page }) => {
  await page.goto("/birthday");
  await page.getByRole("button", { name: /open a tiny birthday surprise/i }).click();
  await expect(page.getByText("A shelf full of stories you love")).toBeVisible();
  await expect(page.getByText("New things that make you curious")).toBeVisible();
});

test("the birthday journey continues through a real-shaped guestbook API and public chat", async ({ page }) => {
  await page.route("**/api/v1/wishes", async (route) => {
    if (route.request().method() === "GET") {
      await route.fulfill({ status: 200, json: [] });
      return;
    }
    const request = route.request().postDataJSON() as { nickname: string; message: string };
    await route.fulfill({
      status: 201,
      json: { id: 21, nickname: request.nickname, message: request.message, created_at: new Date().toISOString() },
    });
  });
  await page.routeWebSocket("**/ws/chat", (socket) => {
    socket.onMessage((serialized) => {
      const event = JSON.parse(String(serialized)) as { type: string; nickname?: string; content?: string };
      if (event.type === "join") {
        socket.send(JSON.stringify({ type: "message_history", messages: [] }));
        socket.send(JSON.stringify({ type: "online_count", count: 1 }));
      } else if (event.type === "message") {
        socket.send(JSON.stringify({
          type: "message",
          is_self: true,
          message: {
            id: 22,
            nickname: event.nickname ?? "Birthday friend",
            content: event.content ?? "",
            created_at: new Date().toISOString(),
          },
        }));
      }
    });
  });

  await page.goto("/");
  await page.getByRole("link", { name: /read your birthday note/i }).click();
  await page.getByRole("button", { name: /open a tiny birthday surprise/i }).click();
  await expect(page.getByText("A shelf full of stories you love")).toBeVisible();

  await page.getByRole("link", { name: "Guestbook" }).click();
  await page.getByLabel("Your name").fill("A friend");
  await page.getByLabel("A little birthday note").fill("Wishing you a lovely birthday!");
  await page.getByRole("button", { name: "Sign the guestbook" }).click();
  await expect(page.getByText("Your birthday wish has been added. Thank you!")).toBeVisible();
  await expect(page.getByText("Wishing you a lovely birthday!")).toBeVisible();

  await page.getByRole("link", { name: "Cozy Corner" }).click();
  await page.getByLabel("Choose a nickname").fill("Story Friend");
  await page.getByRole("button", { name: /join the room/i }).click();
  await expect(page.getByText("Story Friend, you’re in good company.")).toBeVisible();
});

test("mobile navigation opens and follows a destination", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.getByRole("button", { name: "Open menu" }).click();
  await page.getByRole("link", { name: "A birthday note" }).click();
  await expect(page.getByRole("heading", { name: "Happy birthday, Amelia" })).toBeVisible();
});

test("navigation is keyboard accessible and layouts fit common viewport widths", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  const menuButton = page.getByRole("button", { name: "Open menu" });
  await menuButton.focus();
  await expect(menuButton).toBeFocused();
  await page.keyboard.press("Enter");
  const closeMenuButton = page.getByRole("button", { name: "Close menu" });
  await expect(closeMenuButton).toHaveAttribute("aria-expanded", "true");
  const mobileHomeLink = page.getByRole("navigation", { name: "Mobile navigation" }).getByRole("link", { name: "Home" });
  await expect(mobileHomeLink).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: "Open menu" })).toBeFocused();

  for (const width of [375, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  }
});

test("every page fits mobile, tablet, and desktop viewports", async ({ page }) => {
  for (const width of [375, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    if (width < 1024) {
      await expect(page.getByRole("button", { name: "Open menu" })).toBeVisible();
    } else {
      await expect(page.getByRole("navigation", { name: "Main navigation" }).getByRole("link", { name: "Guestbook" })).toBeVisible();
    }
    for (const route of ["/", "/birthday", "/guestbook", "/chat"]) {
      await page.goto(route);
      await expect.poll(() =>
        page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth),
      ).toBe(true);
    }
  }
});

test("the decorative star cluster follows a fine pointer", async ({ page }) => {
  await page.goto("/");
  const stars = page.getByTestId("cursor-stars");
  await expect(stars).toHaveAttribute("data-ready", "true");
  await expect(stars).toHaveCSS("opacity", "0");
  await page.mouse.move(240, 180);
  await expect(stars).toHaveCSS("opacity", "1");
  await expect.poll(() => stars.locator(".cursor-wand").evaluate((element) => (element as HTMLElement).style.transform)).toContain("240px");
});

test("the cursor leaves a fading sparkle-wand trail", async ({ page }) => {
  await page.goto("/");
  const stars = page.getByTestId("cursor-stars");
  await expect(stars).toHaveAttribute("data-ready", "true");
  await page.mouse.move(120, 120);
  await page.mouse.move(260, 200, { steps: 8 });
  await expect.poll(async () => Number(await stars.getAttribute("data-trail-count"))).toBeGreaterThan(0);
  await expect(stars.locator(".wand-trail-spark").first()).toBeVisible();
  await expect.poll(async () => Number(await stars.getAttribute("data-trail-count"))).toBe(0);
});

test("the cursor star cluster is disabled for reduced motion", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect(page.getByTestId("cursor-stars")).toHaveCSS("display", "none");
});
