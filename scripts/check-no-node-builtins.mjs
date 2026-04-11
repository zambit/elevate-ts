import fs from 'fs'
import path from 'path'

const builtins = ['node:', 'fs', 'path', 'os', 'crypto', 'http', 'net', 'stream', 'buffer', 'process']
const distEsmDir = path.join(process.cwd(), 'dist', 'esm')

if (!fs.existsSync(distEsmDir)) {
  console.log(`dist/esm not built yet; skipping Node.js builtin check (will run in test workflow)`)
  process.exit(0)
}

let foundViolations = false

function checkFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8')
  const lines = content.split('\n')

  lines.forEach((line, idx) => {
    builtins.forEach((builtin) => {
      if (line.includes(`'${builtin}'`) || line.includes(`"${builtin}"`)) {
        console.log(`${filePath}:${idx + 1}: ${line.trim()}`)
        foundViolations = true
      }
    })
  })
}

function walk(dir) {
  const files = fs.readdirSync(dir)

  files.forEach((file) => {
    const fullPath = path.join(dir, file)
    const stat = fs.statSync(fullPath)

    if (stat.isDirectory()) {
      walk(fullPath)
    } else if (file.endsWith('.js')) {
      checkFile(fullPath)
    }
  })
}

walk(distEsmDir)

if (foundViolations) {
  process.exit(1)
}
