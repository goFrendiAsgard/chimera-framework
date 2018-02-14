'use strict'

const fse = require('fs-extra')
const path = require('path')
const async = require('neo-async')
const {migrate} = require('./migrate.js')
const {readJsonFile} = require('chimera-framework/lib/util.js')

const specialDirectories = ['chains', 'views', 'public']

module.exports = {
  install,
  uninstall
}

function getMigrationPath (pluginName) {
  return path.join(__dirname, 'node_modules', pluginName, 'migrations')
}

function getNodeModuleSpecialDirectory (pluginName, directory) {
  return path.join(__dirname, 'node_modules', pluginName, directory)
}

function getCmsSpecialDirectory (pluginName, directory) {
  return path.join(__dirname, directory, pluginName)
}

function getPluginSpecialDirectory (pluginName, directory) {
  return path.join(__dirname, 'plugins', pluginName, directory)
}

function install (pluginName) {
  const migrationPath = getMigrationPath(pluginName)
  createCMSDirectory(pluginName, (error) => {
    if (error) {
      return console.error(error)
    }
    return migrate('up', null, { migrationPath })
  })
}

function uninstall (pluginName) {
  const migrationPath = getMigrationPath(pluginName)
  removeCMSDirectory(pluginName, (error) => {
    if (error) {
      return console.error(error)
    }
    return migrate('down', null, { migrationPath })
  })
}

function createCMSDirectory (pluginName, callback) {
  let actions = []
  for (let directory of specialDirectories) {
    let src = getNodeModuleSpecialDirectory(pluginName, directory)
    actions.push((next) => {
      fse.pathExists(src, (error, isExist) => {
        if (error || !isExist) { return next (error)}
        let dst = getCmsSpecialDirectory(pluginName, directory)
        return fse.copy(src, dst, next)
      })
    })
  }
  async.parallel(actions, callback)
}

function removeCMSDirectory (pluginName, callback) {
  let actions = []
  for (let directory of specialDirectories) {
    let dst = getCmsSpecialDirectory(pluginName, directory)
    actions.push((next) => {
      fse.pathExists(dst, (error, isExist) => {
        if (error || !isExist) { return next (error)}
        fse.remove(dst, next)
      })
    })
  }
  async.parallel(actions, callback)
}

function adjustPackageInfo (pluginName, callback) {
  const packageFile = path.join(__dirname, 'plugins', pluginName, 'package.json')
  readJsonFile(packageFile, (error, content) => {
    if (error) { return callback(error) }
    try {
      let obj = JSON.parse(content)
      let {version} = obj
      let versionParts = version.split('.')
      versionParts[versionParts.length - 1] = parseInt(versionParts[versionParts.length - 1]) + 1
      version = versionParts.join('.')
      obj.version = version
      obj.name = pluginName
      content = JSON.stringify(obj, null, 2)
      return fse.writeFile(packageFile, content, callback)
    } catch (error) {
      return callback(error)
    }
  })
}

function packDirectory (pluginName, callback) {

}

function adjustPackageInfoAndPackDirectory (pluginName, callback) {
  adjustPackageInfo(pluginName, (error) => {
    if (error) {
      return callback(error)
    }
    return packDirectory(pluginName, callback)
  })
}

function simplePluginCopyFilter (src, dst) {
  for (let directory of specialDirectories) {
    if (src.indexOf(directory) > -1) { return false }
  }
  return true
}

function pack (pluginName, callback) {
  const dst = getPluginSpecialDirectory(pluginName)
  fse.pathExists(dst, (error, isExist) => {
    if (!isExist(dst)) {
      const src = path.join(__dirname, 'plugins', 'simpleplugin')
      return fse.copy(src, dst, {filter: simplePluginCopyFilter}, (error) => {
        if (error) { return callback(error) }
        return adjustPackageInfoAndPackDirectory(pluginName, callback)
      })
    }
    return adjustPackageInfoAndPackDirectory(pluginName, callback)
  })
}

if (require.main === module) {
  let action = process.argv.length > 3 ? process.argv[3] : 'install'
  let pluginName = process.argv[2]
  if (action === 'install') {
    install(pluginName)
  } else if (action === 'pack') {
    pack(pluginName)
  } else {
    uninstall(pluginName)
  }
}