/**
 * Upload APK + version.json to Supabase Storage
 *
 * Requires SUPABASE_SERVICE_ROLE_KEY in .env or .env.local
 * Run: node scripts/upload-release.js
 */
import { readFileSync, existsSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { createClient } from '@supabase/supabase-js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')

// ── Parse env files ──────────────────────────────────────────────────────────
function parseEnvFile(filePath) {
    if (!existsSync(filePath)) return {}
    return Object.fromEntries(
        readFileSync(filePath, 'utf-8')
            .split('\n')
            .filter(l => l && !l.startsWith('#') && l.includes('='))
            .map(l => { const idx = l.indexOf('='); return [l.slice(0, idx).trim(), l.slice(idx + 1).trim()] })
    )
}

const env = {
    ...parseEnvFile(resolve(root, '.env')),
    ...parseEnvFile(resolve(root, '.env.local')),
    ...process.env,
}

const SUPABASE_URL        = env.VITE_SUPABASE_URL
const SUPABASE_SERVICE_KEY = env.SUPABASE_SERVICE_ROLE_KEY

// ── Diagnostics ──────────────────────────────────────────────────────────────
console.log('ℹ️   Supabase URL:', SUPABASE_URL || '(not set)')
console.log('ℹ️   Service key: ', SUPABASE_SERVICE_KEY
    ? SUPABASE_SERVICE_KEY.slice(0, 20) + '...'
    : '(NOT SET ❌)')

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error('\n❌  SUPABASE_SERVICE_ROLE_KEY not found.')
    console.error('    Add it to .env or .env.local:')
    console.error('    SUPABASE_SERVICE_ROLE_KEY=eyJ...')
    process.exit(1)
}

// ── Read package version ─────────────────────────────────────────────────────
const pkg = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf-8'))
const version = pkg.version
console.log(`ℹ️   Version: ${version}`)

// ── Read release notes from changelog.ts ─────────────────────────────────────
function getChangelogNotes(ver) {
    try {
        const src = readFileSync(resolve(root, 'src/data/changelog.ts'), 'utf-8')
        // Find the entry for this version
        const versionBlockRe = new RegExp(`version:\\s*['"\`]${ver.replace(/\./g, '\\.')}['"\`][\\s\\S]*?(?=\\{\\s*version:|\\]\\s*$)`)
        const block = src.match(versionBlockRe)?.[0] || ''

        const extractList = (field) => {
            const m = block.match(new RegExp(`${field}:\\s*\\[([\\s\\S]*?)\\]`))
            if (!m) return []
            return [...m[1].matchAll(/['"`]([^'"`]+)['"`]/g)].map(x => x[1])
        }

        const features = extractList('features')
        const fixes    = extractList('fixes')
        const highlights = extractList('highlights')

        if (!features.length && !fixes.length && !highlights.length) return `Версия ${ver}`

        const parts = []
        if (highlights.length) parts.push(...highlights)
        if (features.length)   parts.push(...features.map(f => `+ ${f}`))
        if (fixes.length)      parts.push(...fixes.map(f => `✓ ${f}`))
        return parts.join('\n')
    } catch {
        return `Версия ${ver}`
    }
}

const releaseNotes = env.RELEASE_NOTES || getChangelogNotes(version)
console.log(`ℹ️   Notes: ${releaseNotes.split('\n')[0]}${releaseNotes.includes('\n') ? '...' : ''}`)

// ── Supabase client with service role (bypasses RLS) ─────────────────────────
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { persistSession: false }
})

// ── Ensure bucket exists ─────────────────────────────────────────────────────
console.log('\n📦  Checking bucket...')
const { data: buckets, error: listErr } = await supabase.storage.listBuckets()
if (listErr) {
    console.error('❌  Cannot list buckets:', listErr.message)
    console.error('    Probably the service role key is wrong or missing.')
    process.exit(1)
}

const bucketExists = buckets.some(b => b.name === 'releases')
if (!bucketExists) {
    console.log('    Creating bucket "releases" (public)...')
    const { error: createErr } = await supabase.storage.createBucket('releases', { public: true })
    if (createErr) { console.error('❌  Cannot create bucket:', createErr.message); process.exit(1) }
    console.log('    ✓ Bucket created')
} else {
    console.log('    ✓ Bucket "releases" exists')
}

// ── Upload APK ───────────────────────────────────────────────────────────────
const apkPath = resolve(root, 'android/app/build/outputs/apk/debug/app-debug.apk')
if (!existsSync(apkPath)) {
    console.error('\n❌  APK not found:', apkPath)
    console.error('    Run: npm run build-debug-apk  first')
    process.exit(1)
}

const apkBuffer = readFileSync(apkPath)
console.log(`\n⬆️   Uploading APK v${version} (${(apkBuffer.length / 1024 / 1024).toFixed(1)} MB)...`)

const { error: apkError } = await supabase.storage
    .from('releases')
    .upload('app-latest.apk', apkBuffer, {
        contentType: 'application/vnd.android.package-archive',
        upsert: true,
    })

if (apkError) { console.error('❌  APK upload failed:', apkError.message); process.exit(1) }
console.log('✓  APK uploaded')

// ── Upload version.json ──────────────────────────────────────────────────────
const apkUrl = `${SUPABASE_URL}/storage/v1/object/public/releases/app-latest.apk`
const manifest = JSON.stringify({ version, apkUrl, notes: releaseNotes }, null, 2)

const { error: vErr } = await supabase.storage
    .from('releases')
    .upload('version.json', Buffer.from(manifest), {
        contentType: 'application/json',
        upsert: true,
    })

if (vErr) { console.error('❌  version.json upload failed:', vErr.message); process.exit(1) }

console.log(`✓  version.json updated → v${version}`)
console.log(`\n🚀  Done! APK: ${apkUrl}`)
