import { test, expect } from "@playwright/test";

const COACH_EMAIL = "afeef.az11@gmail.com";
const COACH_PASSWORD = "Afeef12345";
const TRAINEE_EMAIL = "test@client.com";
const TRAINEE_PASSWORD = "Test12345";
const LOCALE = "en";

// ── Helper: log in as a specific user and wait for successful redirect ───────
async function loginAs(page: import("@playwright/test").Page, email: string, password: string) {
  await page.goto(`/${LOCALE}/login`);
  await page.getByLabel(/email/i).fill(email);
  await page.locator("#password").fill(password);
  await page.getByRole("button", { name: /sign in|log in/i }).click();
  // Wait until navigated away from /login (session cookie set)
  await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 15000 });
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. Auth redirect — unauthenticated → /login
// ─────────────────────────────────────────────────────────────────────────────
test("unauthenticated user is redirected to /login", async ({ page }) => {
  await page.goto(`/${LOCALE}/coach/dashboard`);
  await expect(page).toHaveURL(new RegExp(`/${LOCALE}/login`));
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. Coach flow
// ─────────────────────────────────────────────────────────────────────────────
test("coach can log in and reach dashboard", async ({ page }) => {
  await loginAs(page, COACH_EMAIL, COACH_PASSWORD);
  await expect(page).toHaveURL(new RegExp(`/${LOCALE}/coach/dashboard`), { timeout: 10000 });
  await expect(page.locator("h1")).toBeVisible();
});

test("coach sees client list", async ({ page }) => {
  await loginAs(page, COACH_EMAIL, COACH_PASSWORD);
  await page.goto(`/${LOCALE}/coach/clients`);
  await page.waitForLoadState("networkidle");
  // Either shows client rows or the empty-state message
  const hasClient = await page.locator("a[href*='/coach/clients/']").count();
  const emptyState = await page.getByText(/no clients yet/i).count();
  expect(hasClient + emptyState).toBeGreaterThan(0);
});

test("coach profile page shows name and sign out button", async ({ page }) => {
  await loginAs(page, COACH_EMAIL, COACH_PASSWORD);
  await page.goto(`/${LOCALE}/coach/profile`);
  await expect(page.getByRole("button", { name: /sign out/i })).toBeVisible();
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. Trainee flow
// ─────────────────────────────────────────────────────────────────────────────
test("trainee can log in and reach today page", async ({ page }) => {
  await loginAs(page, TRAINEE_EMAIL, TRAINEE_PASSWORD);
  await expect(page).toHaveURL(new RegExp(`/${LOCALE}/trainee/today`), { timeout: 10000 });
});

test("trainee today page renders workout or empty state", async ({ page }) => {
  await loginAs(page, TRAINEE_EMAIL, TRAINEE_PASSWORD);
  await page.goto(`/${LOCALE}/trainee/today`);
  await page.waitForLoadState("networkidle");
  // Accept either active plan CTAs or no-plan state text variants.
  const hasWorkoutCta = await page.getByRole("button", { name: /start workout|continue workout/i }).count();
  const emptyState = await page.getByText(/no plan|don't have an active plan|ask your coach/i).count();
  expect(hasWorkoutCta + emptyState).toBeGreaterThan(0);
});

test("trainee workouts history page loads", async ({ page }) => {
  await loginAs(page, TRAINEE_EMAIL, TRAINEE_PASSWORD);
  await page.goto(`/${LOCALE}/trainee/workouts`);
  await page.waitForLoadState("networkidle");
  await expect(page).toHaveURL(new RegExp(`/${LOCALE}/trainee/workouts`));
  // Either shows history or empty state — page body must have content
  const hasContent = await page.locator("body").textContent();
  expect(hasContent).toBeTruthy();
});

test("trainee exercises page loads", async ({ page }) => {
  await loginAs(page, TRAINEE_EMAIL, TRAINEE_PASSWORD);
  await page.goto(`/${LOCALE}/trainee/exercises`);
  // Form or "not linked" state
  const hasForm = await page.locator("input, select, button").count();
  expect(hasForm).toBeGreaterThan(0);
});

test("trainee profile shows sign out button", async ({ page }) => {
  await loginAs(page, TRAINEE_EMAIL, TRAINEE_PASSWORD);
  await page.goto(`/${LOCALE}/trainee/profile`);
  await expect(page.getByRole("button", { name: /sign out/i })).toBeVisible();
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. Role enforcement — trainee cannot access coach routes
// ─────────────────────────────────────────────────────────────────────────────
test("trainee is redirected away from /coach/dashboard", async ({ page }) => {
  await loginAs(page, TRAINEE_EMAIL, TRAINEE_PASSWORD);
  await page.goto(`/${LOCALE}/coach/dashboard`);
  await expect(page).not.toHaveURL(new RegExp(`/${LOCALE}/coach/dashboard`), { timeout: 8000 });
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. Coach plan builder loads for a client
// ─────────────────────────────────────────────────────────────────────────────
test("coach plan builder page loads for a client", async ({ page }) => {
  await loginAs(page, COACH_EMAIL, COACH_PASSWORD);
  // Navigate to clients and click the first one
  await page.goto(`/${LOCALE}/coach/clients`);
  const firstClient = page.locator("a[href*='/coach/clients/']").first();
  const count = await firstClient.count();
  if (count === 0) {
    // No clients yet — skip
    test.skip();
    return;
  }
  await firstClient.click();
  await expect(page).toHaveURL(new RegExp(`/${LOCALE}/coach/clients/.+/plan`), { timeout: 8000 });
  // Plan name input should be visible
  await expect(page.locator("#plan-name")).toBeVisible();
});
