'use strict'

const fse = require('fs-extra')
const path = require('path')
const async = require('neo-async')
const {migrate} = require('./migrate.js')

const specialDirectories = ['chains', 'views', 'public']

module.exports = {
  install,
  uninstall
}

function getMigrationPath (pluginName) {
  return path.join(__dirname, 'node_modules', pluginName, 'migrations')
}

function getSpecialDirectorySrc (pluginName, directory) {
  return path.join(__dirname, 'node_modules', pluginName, directory)
}

function getSpecialDirectoryDst (pluginName, directory) {
  return path.join(__dirname, directory, pluginName)
}

function install (pluginName) {
  const migrationPath = getMigrationPath(pluginName)
  copyAllDir(pluginName, (error) => {
    if (error) {
      return console.error(error)
    }
    return migrate('up', null, { migrationPath })
  })
}

function uninstall (pluginName) {
  const migrationPath = getMigrationPath(pluginName)
  removeAllDir(pluginName, (error) => {
    if (error) {
      return console.error(error)
    }
    return migrate('down', null, { migrationPath })
  })
}

function copyAllDir (pluginName, callback) {
  let actions = []
  for (let directory of specialDirectories) {
    let src = getSpecialDirectorySrc(pluginName, directory)
    actions.push((next) => {
      fse.pathExists(src, (error, isExist) => {
        if (error || !isExist) { return next (error)}
        let dst = getSpecialDirectoryDst(pluginName, directory)
        return fse.copy(src, dst, next)
      })
    })
  }
  async.parallel(actions, callback)
}

function removeAllDir (pluginName, callback) {
  let actions = []
  for (let directory of specialDirectories) {
    let dst = getSpecialDirectoryDst(pluginName, directory)
    actions.push((next) => {
      fse.pathExists(dst, (error, isExist) => {
        if (error || !isExist) { return next (error)}
        fse.remove(dst, next)
      })
    })
  }
  async.parallel(actions, callback)
}

if (require.main === module) {
  let action = process.argv.length > 3 ? process.argv[3] : 'install'
  let pluginName = process.argv[2]
  if (action === 'install') {
    install(pluginName)
  } else {
    uninstall(pluginName)
  }
}