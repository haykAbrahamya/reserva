/**
 * Renders the finished samples the home page cards show (public/examples/).
 *
 * Every tool opens on a localized sample for a first visit. This opens each
 * one that way in headless Chrome, in every language, and keeps what the tool
 * draws — the same code as its export — so a card can never show a design the
 * tool no longer makes. Re-run after changing how a tool looks:
 *
 *   pnpm dev:tools                                   (another terminal)
 *   pnpm --filter @reserva/tools examples [--base http://localhost:5177]
 *
 * Needs Node 22+ (built-in WebSocket) and Google Chrome; set CHROME to use
 * another binary. The before & after sample uses the two photos next to this
 * file (scripts/examples/, free Pexels photos — see the README there).
 */
import { spawn } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const OUT = path.resolve(HERE, '../public/examples')
const PHOTOS = [path.join(HERE, 'examples/before.jpg'), path.join(HERE, 'examples/after.jpg')]
const LOCALES = ['hy', 'ru', 'en']
const BASE = argValue('--base') ?? 'http://localhost:5177'
const PORT = 9411
/** Kept small: a card shows them at 100–180px wide, on screens up to 3× dense. */
const QUALITY = 0.82

/**
 * Each tool's sample, and the width its picture is kept at. A `style` is the
 * story style shown instead of the default — the one matching the card's hue,
 * so the grid shows the range rather than five brown pictures. The visit card
 * is a page that follows the site's theme, so it is kept in both.
 */
const TOOLS = [
  { id: 'priceList', path: '/price-list', width: 400 },
  { id: 'freeSlots', path: '/free-slots', width: 400, style: 'sage', draftKey: 'reserva-tools:free-slots:v1' },
  { id: 'beforeAfter', path: '/before-after', width: 480, photos: true },
  { id: 'appointmentCard', path: '/appointment-card', width: 400, visit: true, themes: ['light', 'dark'] },
  { id: 'giftCertificate', path: '/gift-certificate', width: 480, style: 'lavender', draftKey: 'reserva-tools:gift-certificate:v1' },
]

/** Before & after starts empty: it gets the photos, and a handle like the other samples. */
const BEFORE_AFTER_DRAFT = { format: 'post', arrangement: 'side', beforeLabel: '', afterLabel: '', handle: '@anna.beauty' }

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

function argValue(name) {
  const i = process.argv.indexOf(name)
  return i > 0 ? process.argv[i + 1] : undefined
}

function chromePath() {
  if (process.env.CHROME) return process.env.CHROME
  if (process.platform === 'win32') return 'C:/Program Files/Google/Chrome/Application/chrome.exe'
  if (process.platform === 'darwin') return '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
  return 'google-chrome'
}

async function startChrome() {
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'reserva-examples-'))
  const chrome = spawn(
    chromePath(),
    ['--headless=new', `--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`, '--no-first-run', '--hide-scrollbars', 'about:blank'],
    { stdio: 'ignore' },
  )
  let targets
  for (let i = 0; i < 50 && !targets; i++) {
    try {
      targets = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json()
    } catch {
      await sleep(200)
    }
  }
  if (!targets) throw new Error(`Chrome did not start (${chromePath()}). Set CHROME to its path.`)

  const ws = new WebSocket(targets.find((t) => t.type === 'page').webSocketDebuggerUrl)
  await new Promise((resolve) => ws.addEventListener('open', resolve, { once: true }))
  let id = 0
  const pending = new Map()
  ws.addEventListener('message', (event) => {
    const msg = JSON.parse(event.data)
    if (!msg.id || !pending.has(msg.id)) return
    const { resolve, reject } = pending.get(msg.id)
    pending.delete(msg.id)
    if (msg.error) reject(new Error(msg.error.message))
    else resolve(msg.result)
  })
  const send = (method, params = {}) =>
    new Promise((resolve, reject) => {
      const n = ++id
      pending.set(n, { resolve, reject })
      ws.send(JSON.stringify({ id: n, method, params }))
    })
  const evaluate = async (expression) => {
    const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true })
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? r.exceptionDetails.text)
    return r.result.value
  }
  const close = () => {
    try {
      ws.close()
    } catch {
      // Already gone.
    }
    chrome.kill()
  }
  return { send, evaluate, close }
}

/**
 * In the page: a canvas (or an image) down to `width`, halving first — one big
 * jump would alias the hairlines — and encoded as WebP, base64.
 */
const SHRINK = `async (source, width, quality) => {
  let from = source
  while (from.width / 2 >= width) {
    const half = document.createElement('canvas')
    half.width = Math.round(from.width / 2)
    half.height = Math.round(from.height / 2)
    const ctx = half.getContext('2d')
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(from, 0, 0, half.width, half.height)
    from = half
  }
  const out = document.createElement('canvas')
  out.width = width
  out.height = Math.round((source.height * width) / source.width)
  const ctx = out.getContext('2d')
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(from, 0, 0, out.width, out.height)
  return out.toDataURL('image/webp', quality).split(',')[1]
}`

/** A fresh first visit in `locale`: nothing stored but the language and the site theme. */
async function openAsFirstVisit(page, locale, urlPath, draft, theme = 'light') {
  await page.send('Page.navigate', { url: `${BASE}/__examples` })
  await sleep(800)
  const entries = {
    'reserva-tools-locale': locale,
    'reserva-tools-locale-explicit': '1',
    'reserva-tools-theme-choice': theme,
    ...draft,
  }
  await page.evaluate(
    `localStorage.clear(); sessionStorage.clear(); ${Object.entries(entries)
      .map(([k, v]) => `localStorage.setItem(${JSON.stringify(k)}, ${JSON.stringify(v)})`)
      .join('; ')}; true`,
  )
  await page.send('Page.navigate', { url: `${BASE}${urlPath}` })
  await settle(page)
}

/** Loaded, with the faces its text needs: the preview redraws once they arrive. */
async function settle(page) {
  await sleep(2500)
  await page.evaluate(`document.fonts.ready.then(() => new Promise((r) => setTimeout(r, 700)))`)
}

/** The sample the tool opened on, in another story style: its stored draft, restyled, reloaded. */
async function restyle(page, tool) {
  const done = await page.evaluate(`(() => {
    const draft = JSON.parse(localStorage.getItem(${JSON.stringify(tool.draftKey)}) ?? 'null')
    if (!draft) return false
    localStorage.setItem(${JSON.stringify(tool.draftKey)}, JSON.stringify({ ...draft, themeId: ${JSON.stringify(tool.style)} }))
    return true
  })()`)
  if (!done) throw new Error(`${tool.id}: no stored draft under ${tool.draftKey} to restyle`)
  await page.send('Page.reload')
  await settle(page)
}

/**
 * The tool's live preview: the same canvas, at full export size, that its
 * download encodes — the one in the zoom button (CanvasPreview), not a photo's
 * framing canvas.
 */
async function previewCanvas(page, width) {
  return page.evaluate(`(${SHRINK})(document.querySelector('button > canvas[role="img"]'), ${width}, ${QUALITY})`)
}

async function beforeAfter(page, locale, tool) {
  await openAsFirstVisit(page, locale, tool.path, {
    'reserva-tools:before-after:v1': JSON.stringify(BEFORE_AFTER_DRAFT),
  })
  const { root } = await page.send('DOM.getDocument', { depth: -1 })
  const { nodeIds } = await page.send('DOM.querySelectorAll', { nodeId: root.nodeId, selector: 'input[type="file"]' })
  if (nodeIds.length < 2) throw new Error('before & after: expected two photo inputs')
  for (const [i, file] of PHOTOS.entries()) {
    await page.send('DOM.setFileInputFiles', { nodeId: nodeIds[i], files: [file] })
    await sleep(1200)
  }
  await sleep(800)
  return previewCanvas(page, tool.width)
}

/** The card the client opens: the editor's own link to it, shot on a phone. */
async function visitCard(page, locale, tool, theme) {
  await openAsFirstVisit(page, locale, tool.path, {}, theme)
  const href = await page.evaluate(`document.querySelector('a[href*="/visit#"]')?.href ?? null`)
  if (!href) throw new Error('appointment card: no link to the visit page')

  await page.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true })
  await page.send('Page.navigate', { url: href })
  await sleep(2000)
  await page.evaluate(`document.fonts.ready.then(() => new Promise((r) => setTimeout(r, 500)))`)
  const box = await page.evaluate(`(() => {
    const r = document.querySelector('article').getBoundingClientRect()
    return { x: r.x + scrollX, y: r.y + scrollY, width: r.width, height: r.height }
  })()`)
  const { data } = await page.send('Page.captureScreenshot', {
    format: 'png',
    clip: { ...box, scale: 1 },
    captureBeyondViewport: true,
  })
  await page.send('Emulation.clearDeviceMetricsOverride')
  return page.evaluate(`(async () => {
    const img = new Image()
    img.src = 'data:image/png;base64,${data}'
    await img.decode()
    return (${SHRINK})(img, ${tool.width}, ${QUALITY})
  })()`)
}

async function main() {
  try {
    await fetch(BASE)
  } catch {
    throw new Error(`Nothing answers at ${BASE} — start the tools first (pnpm dev:tools), or pass --base.`)
  }
  fs.mkdirSync(OUT, { recursive: true })

  const page = await startChrome()
  try {
    await page.send('Page.enable')
    await page.send('DOM.enable')
    await page.send('Network.enable')
    // The samples are not visits: keep them out of the analytics.
    await page.send('Network.setBlockedURLs', { urls: ['*/public/pulse*'] })
    await page.send('Emulation.setDeviceMetricsOverride', { width: 1366, height: 900, deviceScaleFactor: 1, mobile: false })

    const save = (name, base64) => {
      const file = path.join(OUT, `${name}.webp`)
      fs.writeFileSync(file, Buffer.from(base64, 'base64'))
      console.log(`${path.relative(process.cwd(), file)}  ${(fs.statSync(file).size / 1024).toFixed(1)} KB`)
    }
    for (const locale of LOCALES) {
      for (const tool of TOOLS) {
        if (tool.visit) {
          for (const theme of tool.themes) {
            save(`${tool.id}-${locale}${theme === 'dark' ? '-dark' : ''}`, await visitCard(page, locale, tool, theme))
            await page.send('Emulation.setDeviceMetricsOverride', { width: 1366, height: 900, deviceScaleFactor: 1, mobile: false })
          }
          continue
        }
        if (tool.photos) {
          save(`${tool.id}-${locale}`, await beforeAfter(page, locale, tool))
          continue
        }
        await openAsFirstVisit(page, locale, tool.path)
        if (tool.style) await restyle(page, tool)
        save(`${tool.id}-${locale}`, await previewCanvas(page, tool.width))
      }
    }
  } finally {
    page.close()
  }
}

main().catch((err) => {
  console.error(err.message)
  process.exit(1)
})
