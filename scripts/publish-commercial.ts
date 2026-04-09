import fs from 'fs'
import path from 'path'
import { execSync } from 'child_process'

const __dirname = new URL('.', import.meta.url).pathname

interface PackageJson {
  license?: string
  publishConfig?: {
    tag?: string
    [key: string]: unknown
  }
  [key: string]: unknown
}

const pkgPath = path.join(__dirname, '..', 'package.json')
const licensePath = path.join(__dirname, '..', 'LICENSE')
const agplBackupPath = path.join(__dirname, '..', 'LICENSE.agpl')
const commercialLicensePath = path.join(__dirname, '..', 'COMMERCIAL-LICENSE.md')

function readPackageJson(): PackageJson {
  return JSON.parse(fs.readFileSync(pkgPath, 'utf8'))
}

function writePackageJson(pkg: PackageJson): void {
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n')
}

function swapLicenseToCommercial(): void {
  if (fs.existsSync(licensePath)) {
    fs.renameSync(licensePath, agplBackupPath)
  }

  if (!fs.existsSync(commercialLicensePath)) {
    throw new Error('COMMERCIAL-LICENSE.md not found')
  }

  fs.copyFileSync(commercialLicensePath, licensePath)
}

function restoreAgplLicense(): void {
  if (fs.existsSync(licensePath)) {
    fs.unlinkSync(licensePath)
  }

  if (fs.existsSync(agplBackupPath)) {
    fs.renameSync(agplBackupPath, licensePath)
  }
}

function publishCommercial(): void {
  const pkg = readPackageJson()
  const originalLicense = pkg.license
  const originalTag = pkg.publishConfig?.tag

  console.log('📦 Publishing commercial version of elevate-ts...')

  try {
    // Update package.json for commercial release
    pkg.license = 'SEE COMMERCIAL-LICENSE.md'
    pkg.publishConfig = pkg.publishConfig || {}
    pkg.publishConfig.tag = 'commercial'
    writePackageJson(pkg)

    // Swap LICENSE files
    swapLicenseToCommercial()
    console.log('✓ License file swapped')

    // Publish
    console.log('🚀 Publishing to npm with commercial tag...')
    execSync('npm publish --tag commercial --provenance', { stdio: 'inherit' })

    console.log('✅ Commercial version published!')
  } catch (error) {
    console.error('❌ Error during publish:', error instanceof Error ? error.message : String(error))
    process.exit(1)
  } finally {
    // Restore original state
    const restoredPkg = readPackageJson()
    restoredPkg.license = originalLicense
    restoredPkg.publishConfig = restoredPkg.publishConfig || {}
    restoredPkg.publishConfig.tag = originalTag
    writePackageJson(restoredPkg)

    restoreAgplLicense()
    console.log('🔄 Repository restored to AGPL default')
  }
}

publishCommercial()
