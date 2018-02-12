const fse = require('fs-extra')
const path = require('path')
const cmd = require('chimera-framework/lib/cmd.js')

function getModuleName (chainCwd) {
  return path.basename(chainCwd)
}

function copyDir (chainCwd, directory, callback) {
  fse.pathExists(chainCwd + directory, (error, isExist) => {
    if (isExist) {
      const moduleName = getModuleName(chainCwd)
      const srcFile = chainCwd + directory
      const dstFile = chainCwd + '../../' + directory + '/' + moduleName
      return fse.copy(srcFile, dstFile, (error) => {
        return callback(error)
      })
    }
    return callback(error)
  })
}

function removeDir (chainCwd, directory, callback) {
  const moduleName = getModuleName(chainCwd)
  fse.remove(chainCwd + '../../' + directory + moduleName, callback)
}

function getMigrationConfig (chainCwd) {
  const migrationPath = chainCwd + 'migrations/'
  return {migrationPath}
}

module.exports = {
  copyDir,
  removeDir,
  getMigrationConfig
}