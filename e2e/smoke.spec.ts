import { test, expect } from '@playwright/test'

async function clearAppState(page: import('@playwright/test').Page) {
  await page.addInitScript(() => {
    try {
      localStorage.clear()
      indexedDB.deleteDatabase('keyval-store')
    } catch {
      /* ignore */
    }
  })
}

test.describe('Noto smoke', () => {
  test.beforeEach(async ({ page }) => {
    await clearAppState(page)
    await page.goto('/')
    await expect(page.getByTestId('app-shell')).toBeVisible({ timeout: 20_000 })
  })

  test('home loads with greeting', async ({ page }) => {
    await expect(page.getByTestId('home-title')).toContainText('안녕')
    await expect(page.getByTestId('home-view')).toBeVisible()
  })

  test('can open settings from more menu or sidebar', async ({ page }) => {
    const mobile = (await page.getByTestId('app-shell').getAttribute('data-mobile')) === '1'
    if (mobile) {
      await page.getByTestId('mobile-menu-btn').click()
    } else if (!(await page.getByTestId('sidebar').isVisible().catch(() => false))) {
      await page.getByTestId('desktop-open-sidebar').click()
    }

    const sidebar = page.getByTestId('sidebar')
    await expect(sidebar).toBeVisible()

    // Settings lives under "더 보기" (collapsed by default)
    const settingsInSidebar = sidebar.getByRole('button', { name: '설정', exact: true })
    if (!(await settingsInSidebar.isVisible().catch(() => false))) {
      await sidebar.getByRole('button', { name: '더 보기', exact: true }).click()
    }
    await settingsInSidebar.click()

    await expect(page.getByRole('heading', { name: '설정' })).toBeVisible()
    await expect(page.getByText('금고 (비밀번호 잠금)')).toBeVisible()
  })

  test('creates a new page', async ({ page }) => {
    const mobile = (await page.getByTestId('app-shell').getAttribute('data-mobile')) === '1'
    if (mobile) {
      await page.getByTestId('mobile-new-btn').click()
    } else {
      if (!(await page.getByTestId('sidebar').isVisible().catch(() => false))) {
        await page.getByTestId('desktop-open-sidebar').click()
      }
      await page.getByTestId('sidebar-new-page').click()
    }
    // Page view should show a title input or content area
    await expect(page.getByTestId('main-content')).toBeVisible()
    // Leave home
    await expect(page.getByTestId('home-view')).toHaveCount(0)
  })

  test('mobile drawer opens and closes', async ({ page }) => {
    const mobile = (await page.getByTestId('app-shell').getAttribute('data-mobile')) === '1'
    test.skip(!mobile, 'mobile project only')

    await page.getByTestId('mobile-menu-btn').click()
    await expect(page.getByTestId('sidebar')).toBeVisible()
    await page.getByTestId('sidebar-close').click()
    await expect(page.getByTestId('sidebar')).toHaveCount(0)

    await page.getByTestId('mobile-menu-btn').click()
    await page.getByTestId('sidebar-overlay').locator('.sidebar-backdrop').click()
    await expect(page.getByTestId('sidebar')).toHaveCount(0)
  })
})
