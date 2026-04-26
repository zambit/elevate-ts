import fs from 'fs'
import path from 'path'

const packageJsonPath = path.join(process.cwd(), 'package.json')
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'))

const distDir = path.join(process.cwd(), 'dist')

if (!fs.existsSync(distDir)) {
  console.log(`dist/ not built yet; skipping export validation (will run in publish workflow)`)
  process.exit(0)
}

let missingFiles = []

const exports = packageJson.exports || {}

for (const [subpath, conditions] of Object.entries(exports)) {
  if (typeof conditions === 'object' && conditions !== null) {
    for (const [condition, filePath] of Object.entries(conditions)) {
      if (typeof filePath === 'string') {
        const fullPath = path.join(process.cwd(), filePath)
        if (!fs.existsSync(fullPath)) {
          missingFiles.push({ subpath, condition, filePath })
        }
      }
    }
  }
}

if (missingFiles.length > 0) {
  console.error(`[check-exports] Missing export files:`)
  missingFiles.forEach(({ subpath, condition, filePath }) => {
    console.error(`  ${subpath} (${condition}): ${filePath}`)
  })
  process.exit(1)
}

console.log(`[check-exports] All ${Object.keys(exports).length} exports verified`)
process.exit(0)
