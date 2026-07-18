const { app, BrowserWindow, dialog, ipcMain, net, shell } = require('electron')
const { spawn } = require('node:child_process')
const { access, mkdir, readFile, rename, writeFile } = require('node:fs/promises')
const path = require('node:path')
const os = require('node:os')
const { DesktopUpdateService } = require('./update-service.cjs')
const { WeatherService } = require('./weather-service.cjs')

let mainWindow
let updateService
let weatherService

const databasePath = () => path.join(app.getPath('userData'), 'starling-archive.json')
const preferencesPath = () => path.join(app.getPath('userData'), 'preferences.json')

async function readJson(file, fallback) {
  try { return JSON.parse(await readFile(file, 'utf8')) } catch { return fallback }
}

async function writeJsonAtomic(file, value) {
  await mkdir(path.dirname(file), { recursive: true })
  const temporary = `${file}.tmp`
  await writeFile(temporary, JSON.stringify(value, null, 2), 'utf8')
  await rename(temporary, file)
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 1040,
    minHeight: 700,
    backgroundColor: '#080810',
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    trafficLightPosition: { x: 18, y: 18 },
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  })

  const devUrl = process.env.VITE_DEV_SERVER_URL
  if (devUrl) mainWindow.loadURL(devUrl)
  else mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'))

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//.test(url)) shell.openExternal(url)
    return { action: 'deny' }
  })
}

app.whenReady().then(() => {
  updateService = new DesktopUpdateService(app, (...args) => net.fetch(...args))
  weatherService = new WeatherService((...args) => net.fetch(...args))
  createWindow()
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow() })
})

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit() })

ipcMain.handle('database:load', async () => readJson(databasePath(), null))
ipcMain.handle('database:save', async (_event, vault) => {
  if (!vault || typeof vault !== 'object' || vault.schemaVersion !== 1) throw new Error('Invalid archive data.')
  await writeJsonAtomic(databasePath(), vault)
  return true
})
ipcMain.handle('database:export', async () => {
  const result = await dialog.showSaveDialog(mainWindow, {
    title: 'Export Starling Archive',
    defaultPath: `starling-archive-${new Date().toISOString().slice(0, 10)}.json`,
    filters: [{ name: 'JSON archive', extensions: ['json'] }],
  })
  if (result.canceled || !result.filePath) return null
  const vault = await readJson(databasePath(), null)
  if (!vault) throw new Error('There is no archive to export yet.')
  await writeJsonAtomic(result.filePath, vault)
  return result.filePath
})
ipcMain.handle('database:import', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Import Starling Archive',
    properties: ['openFile'],
    filters: [{ name: 'JSON archive', extensions: ['json'] }],
  })
  if (result.canceled || !result.filePaths[0]) return null
  const incoming = await readJson(result.filePaths[0], null)
  if (!incoming || incoming.schemaVersion !== 1) throw new Error('This is not a valid Starling Archive export.')
  await writeJsonAtomic(databasePath(), incoming)
  return incoming
})

async function executableExists(candidate) {
  if (!candidate) return false
  if (!candidate.includes(path.sep)) return new Promise((resolve) => {
    const command = process.platform === 'win32' ? 'where' : 'which'
    const child = spawn(command, [candidate], { windowsHide: true })
    child.on('close', (code) => resolve(code === 0))
    child.on('error', () => resolve(false))
  })
  try { await access(candidate); return true } catch { return false }
}

async function configuredBinary() {
  const preferences = await readJson(preferencesPath(), {})
  if (await executableExists(preferences.codexBinary)) return preferences.codexBinary
  const home = os.homedir()
  const candidates = process.platform === 'win32'
    ? ['codex.cmd', 'codex.exe', path.join(home, 'AppData', 'Roaming', 'npm', 'codex.cmd')]
    : ['codex', '/opt/homebrew/bin/codex', '/usr/local/bin/codex', path.join(home, '.npm-global', 'bin', 'codex')]
  for (const candidate of candidates) if (await executableExists(candidate)) return candidate
  return preferences.codexBinary || 'codex'
}

function runCommand(command, args, input, timeoutMs = 20000) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { windowsHide: true, env: { ...process.env, NO_COLOR: '1' } })
    let stdout = ''
    let stderr = ''
    const timeout = setTimeout(() => {
      child.kill()
      reject(new Error('Codex took too long to respond. Try again.'))
    }, timeoutMs)
    child.stdout.on('data', (chunk) => { stdout += chunk.toString() })
    child.stderr.on('data', (chunk) => { stderr += chunk.toString() })
    child.on('error', (error) => { clearTimeout(timeout); reject(error) })
    child.on('close', (code) => {
      clearTimeout(timeout)
      if (code === 0) resolve({ stdout, stderr })
      else reject(new Error(stderr.trim() || stdout.trim() || `Codex exited with code ${code}.`))
    })
    if (input) child.stdin.end(input)
    else child.stdin.end()
  })
}

ipcMain.handle('codex:status', async () => {
  const binary = await configuredBinary()
  try {
    const version = await runCommand(binary, ['--version'], null, 5000)
    const auth = await runCommand(binary, ['login', 'status'], null, 8000).catch(() => ({ stdout: '', stderr: '' }))
    const authText = `${auth.stdout} ${auth.stderr}`.trim()
    return { available: true, authenticated: /logged in|authenticated/i.test(authText), binary, version: version.stdout.trim(), detail: authText }
  } catch (error) {
    return { available: false, authenticated: false, binary, version: '', detail: error.message }
  }
})

ipcMain.handle('codex:choose-binary', async () => {
  const result = await dialog.showOpenDialog(mainWindow, { title: 'Choose the Codex executable', properties: ['openFile'] })
  if (result.canceled || !result.filePaths[0]) return null
  const preferences = await readJson(preferencesPath(), {})
  preferences.codexBinary = result.filePaths[0]
  await writeJsonAtomic(preferencesPath(), preferences)
  return result.filePaths[0]
})
ipcMain.handle('codex:set-binary', async (_event, binary) => {
  const preferences = await readJson(preferencesPath(), {})
  preferences.codexBinary = String(binary || '').trim()
  await writeJsonAtomic(preferencesPath(), preferences)
  return true
})

ipcMain.handle('codex:generate', async (_event, request) => {
  if (!request || typeof request.prompt !== 'string' || request.prompt.length > 120000) throw new Error('Invalid generation request.')
  const binary = await configuredBinary()
  const runtime = path.join(app.getPath('userData'), 'codex-runtime')
  await mkdir(runtime, { recursive: true })
  const output = path.join(runtime, `response-${Date.now()}.txt`)
  const args = [
    'exec', '--ephemeral', '--skip-git-repo-check', '--ignore-user-config', '--ignore-rules',
    '--sandbox', 'read-only', '--model', 'gpt-5.6-luna',
    '-c', 'model_reasoning_effort="low"', '-c', 'approval_policy="never"',
    '--cd', runtime, '--output-last-message', output, '-'
  ]
  try {
    await runCommand(binary, args, request.prompt, 180000)
    const text = (await readFile(output, 'utf8')).trim()
    if (!text) throw new Error('Luna returned an empty response.')
    return { text, model: 'gpt-5.6-luna', reasoning: 'low' }
  } catch (error) {
    const message = error.code === 'ENOENT'
      ? 'Codex was not found. Open Settings and choose your Codex executable.'
      : error.message
    throw new Error(message)
  }
})

ipcMain.handle('app:version', () => app.getVersion())
ipcMain.handle('app:info', () => ({
  version: app.getVersion(),
  platform: process.platform,
  arch: process.arch,
  packaged: app.isPackaged,
}))
ipcMain.handle('update:install', () => updateService.downloadAndInstall((progress) => {
  if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('update:progress', progress)
}))
ipcMain.handle('weather:current', (_event, force = false) => weatherService.current(Boolean(force)))
ipcMain.handle('app:open-external', async (_event, url) => {
  if (!/^https:\/\//.test(url)) throw new Error('Only secure web links can be opened.')
  await shell.openExternal(url)
  return true
})
