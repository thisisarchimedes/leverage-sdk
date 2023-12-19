const fs = require('fs')
const path = require('path')

const buildSrcDir = path.join(__dirname, 'build', 'src')
const buildDir = path.join(__dirname, 'build')

// Move all files from build/src to build
fs.readdirSync(buildSrcDir).forEach((file) => {
  const currentPath = path.join(buildSrcDir, file)
  const newPath = path.join(buildDir, file)
  fs.renameSync(currentPath, newPath)
})

// Remove the now empty build/src directory
fs.rmdirSync(buildSrcDir)

console.log('Files moved and build/src directory removed successfully.')
