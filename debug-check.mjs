import puppeteer from 'puppeteer-core'

const browser = await puppeteer.launch({
  executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  headless: true,
  args: ['--no-sandbox', '--disable-gpu'],
})
const page = await browser.newPage()
const logs = []
page.on('console', (msg) => logs.push(`[${msg.type()}] ${msg.text()}`))
page.on('pageerror', (err) => logs.push(`[pageerror] ${err.message}\n${err.stack}`))
page.on('requestfailed', (req) => logs.push(`[requestfailed] ${req.url()} ${req.failure()?.errorText}`))

await page.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle0', timeout: 30000 })
await new Promise((r) => setTimeout(r, 1500))

const info = await page.evaluate(() => {
  const root = document.getElementById('root')
  return {
    rootHTML: root?.innerHTML?.slice(0, 500) ?? null,
    rootChildCount: root?.childElementCount ?? -1,
    bodyText: document.body?.innerText?.slice(0, 300) ?? '',
    title: document.title,
  }
})

console.log(JSON.stringify({ info, logs }, null, 2))
await page.screenshot({ path: 'debug-screenshot2.png', fullPage: true })
await browser.close()
