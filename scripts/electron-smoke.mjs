import { _electron as electron } from 'playwright-core'
import { mkdir, rm } from 'node:fs/promises'
import path from 'node:path'

const root = process.cwd()
const executablePath = path.join(root, 'node_modules', 'electron', 'dist', process.platform === 'win32' ? 'electron.exe' : process.platform === 'darwin' ? 'Electron.app/Contents/MacOS/Electron' : 'electron')
await mkdir(path.join(root, 'artifacts'), { recursive: true })
const testProfile = path.join(root, 'artifacts', 'electron-profile')
await rm(testProfile, { recursive: true, force: true })

const app = await electron.launch({ executablePath, args: [`--user-data-dir=${testProfile}`, root], cwd: root, env: { ...process.env, NODE_ENV: 'test' } })
try {
  const window = await app.firstWindow()
  await window.waitForSelector('text=Every voice.')
  await window.getByRole('button', { name: 'Characters' }).click()
  await window.waitForSelector('text=Lyra Vale')
  await window.getByRole('button', { name: 'New Character' }).click()
  await window.getByLabel('Character name').fill('Smoke Test Sage')
  await window.getByLabel('Persona bio').fill('A careful test character who always speaks clearly and briefly.')
  await window.getByLabel('Default greeting').fill('The sage nods. “The archive remembers.”')
  await window.getByRole('button', { name: 'Save character' }).click()
  await window.getByRole('heading', { name: 'Smoke Test Sage' }).waitFor()
  await window.waitForTimeout(500)
  await window.reload()
  await window.getByRole('button', { name: 'Characters' }).click()
  await window.getByRole('heading', { name: 'Smoke Test Sage' }).waitFor()
  await window.getByRole('button', { name: 'Lore Library' }).click()
  await window.waitForSelector('text=The Astral Tide')
  await window.getByRole('button', { name: 'About & Guide' }).click()
  await window.waitForSelector('text=A private stage for impossible conversations.')
  await window.screenshot({ path: path.join(root, 'artifacts', 'electron-smoke.png'), fullPage: true })
  console.log('Electron smoke test passed: navigation, character creation, persistence, seeded lore, and About guide rendered.')
} finally {
  await app.close()
}
