const test = require('node:test')
const assert = require('node:assert/strict')

const {
  MAC_INSTALL_SCRIPT,
  isNewerVersion,
  macBundleFromExecutable,
  pickReleaseAsset,
  releaseVersion,
} = require('./update-service.cjs')
const { WeatherService, weatherCondition, weatherUrl } = require('./weather-service.cjs')

test('version comparison only accepts a newer semantic release', () => {
  assert.equal(isNewerVersion('v0.2.0', '0.1.1'), true)
  assert.equal(isNewerVersion('0.2.0', '0.2.0'), false)
  assert.equal(isNewerVersion('0.1.9', '0.2.0'), false)
  assert.equal(isNewerVersion('1.0.0', '0.99.99'), true)
})

test('release assets are selected for each supported desktop target', () => {
  const assets = [
    { name: 'Starling.Archive-0.2.0-arm64-mac.zip' },
    { name: 'Starling.Archive-0.2.0-mac.zip' },
    { name: 'Starling.Archive.0.2.0.exe' },
    { name: 'Starling.Archive.Setup.0.2.0.exe' },
  ]
  assert.equal(pickReleaseAsset(assets, 'darwin', 'arm64').name, assets[0].name)
  assert.equal(pickReleaseAsset(assets, 'darwin', 'x64').name, assets[1].name)
  assert.equal(pickReleaseAsset(assets, 'win32', 'x64').name, assets[3].name)
  assert.equal(pickReleaseAsset(assets, 'linux', 'x64'), undefined)
})

test('release and macOS bundle helpers normalize updater metadata', () => {
  assert.equal(releaseVersion({ tag_name: 'v0.2.0' }), '0.2.0')
  assert.equal(
    macBundleFromExecutable('/Applications/Starling Archive.app/Contents/MacOS/Starling Archive'),
    '/Applications/Starling Archive.app',
  )
  assert.match(MAC_INSTALL_SCRIPT, /backup_app="\$\{target_app\}\.update-backup"/)
  assert.doesNotMatch(MAC_INSTALL_SCRIPT, /\\\$\{target_app\}/)
})

test('Huntsville weather uses Fahrenheit current conditions and Central time', () => {
  const url = new URL(weatherUrl())
  assert.equal(url.hostname, 'api.open-meteo.com')
  assert.equal(url.searchParams.get('temperature_unit'), 'fahrenheit')
  assert.equal(url.searchParams.get('timezone'), 'America/Chicago')
  assert.equal(url.searchParams.get('current'), 'temperature_2m,weather_code,is_day')
  assert.deepEqual(weatherCondition(0), { label: 'Clear', tone: 'clear' })
  assert.deepEqual(weatherCondition(63), { label: 'Rainy', tone: 'rain' })
  assert.deepEqual(weatherCondition(95), { label: 'Stormy', tone: 'storm' })
})

test('weather service normalizes and caches current conditions', async () => {
  let calls = 0
  const service = new WeatherService(async () => {
    calls += 1
    return {
      ok: true,
      json: async () => ({ current: { temperature_2m: 83.6, weather_code: 2, is_day: 1, time: '2026-07-18T14:15' } }),
    }
  })
  const first = await service.current()
  const second = await service.current()
  assert.equal(first.temperature, 84)
  assert.equal(first.condition, 'Partly Cloudy')
  assert.equal(second.cached, true)
  assert.equal(calls, 1)
})
