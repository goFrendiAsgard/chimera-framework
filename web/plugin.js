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
  createCmsDirectory(pluginName, (error) => {
    if (error) {
      return console.error(error)
    }
    return migrate('up', null, { migrationPath })
  })
}

function uninstall (pluginName) {
  const migrationPath = getMigrationPath(pluginName)
  removeCmsDirectory(pluginName, (error) => {
    if (error) {
      return console.error(error)
    }
    return migrate('down', null, { migrationPath })
  })
}

function createCmsDirectory (pluginName, callback) {
  let actions = []
  for (let directory of specialDirectories) {
    let src = getNodeModuleSpecialDirectory(pluginName, directory)
    actions.push((next) => {
      fse.pathExists(src, (error, exists) => {
        if (error || !exists) { return next (error)}
        let dst = getCmsSpecialDirectory(pluginName, directory)
        return fse.copy(src, dst, next)
      })
    })
  }
  async.parallel(actions, callback)
}

function removeCmsDirectory (pluginName, callback) {
  let actions = []
  for (let directory of specialDirectories) {
    let dst = getCmsSpecialDirectory(pluginName, directory)
    actions.push((next) => {
      fse.pathExists(dst, (error, exists) => {
        if (error || !exists) { return next (error)}
        fse.remove(dst, next)
      })
    })
  }
  async.parallel(actions, callback)
}

function adjustPackage (pluginName, callback) {
  const packageFile = path.join(__dirname, 'plugins', pluginName, 'package.json')
  readJsonFile(packageFile, (error, obj) => {
    if (error) { return callback(error) }
    try {
      let {version} = obj
      let versionParts = version.split('.')
      versionParts[versionParts.length - 1] = parseInt(versionParts[versionParts.length - 1]) + 1
      version = versionParts.join('.')
      obj.version = version
      obj.name = pluginName
      const content = JSON.stringify(obj, null, 2)
      return fse.writeFile(packageFile, content, callback)
    } catch (error) {
      return callback(error)
    }
  })
}

function packMigrationFiles (pluginName, callback) {
  const pluginDirectory = path.join(__dirname, 'plugins', pluginName)
  fse.readdir(path.join(__dirname, 'migrations'), (error, files) => {
    if (error) { return callback(error) }
    let actions = []
    for (let file of files) {
      if (file.indexOf(pluginName) === 0) {
        actions.push((next) => {
          const src = path.join(__dirname, 'migrations', file)
          const dst = path.join(pluginDirectory, 'migrations', file)
          fse.copy(src, dst, next)
        })
      }
    }
    async.parallel(actions, callback)
  })
}

function packDirectories (pluginName, callback) {
  let actions = [
    (next) => {
      packMigrationFiles(pluginName, next)
    }
  ]
  for (let directory of specialDirectories) {
    if (directory === 'migrations') { continue }
    const src = getCmsSpecialDirectory(pluginName, directory)
    const dst = getPluginSpecialDirectory(pluginName, directory)
    actions.push((next) => {
      fse.exists(src, (error, exists) => {
        if (error || !exists) { return next(error) }
        return fse.copy(src, dst, next)
      })
    })
  }
  async.parallel(actions, callback)
}

function adjustPackageAndPackDirectories (pluginName, callback) {
  adjustPackage(pluginName, (error) => {
    if (error) {
      return callback(error)
    }
    return packDirectories(pluginName, callback)
  })
}

function createPluginSpecialDirectories (pluginName, callback) {
  let actions = []
  for (let directory of specialDirectories) {
    let dst = getPluginSpecialDirectory(pluginName, directory)
    actions.push((next) => {
      fse.ensureDir(dst, next)
    })
  }
  async.parallel(actions, callback)
}

function packCallback (error) {
  if (error) { return console.error(error) }
  console.error('Done packing')
}

function pack (pluginName) {
  const pluginDirectory = path.join(__dirname, 'plugins', pluginName)
  const packageSrc = path.join(__dirname, 'plugin-template/package.json')
  const packageDst = path.join(pluginDirectory, 'package.json')
  const setupSrc = path.join(__dirname, 'plugin-template/setup.js')
  const setupDst = path.join(pluginDirectory, 'setup.js')
  fse.ensureDir(pluginDirectory, (error) => {
    if (error) { return console.error(error) }
    async.parallel([
      // create special directories
      (next) => {
        createPluginSpecialDirectories(pluginName, next)
      },
      // copy package.json
      (next) => {
        fse.pathExists(packageDst, (error, exists) => {
          if (error || exists) { return next(error) }
          return fse.copy(packageSrc, packageDst, next)
        })
      },
      // copy setup.js
      (next) => {
        fse.pathExists(setupDst, (error, exists) => {
          if (error || exists) { return next(error) }
          return fse.copy(setupSrc, setupDst, next)
        })
      }
    ], (error) => {
      if (error) { return console.error(error) }
      return adjustPackageAndPackDirectories(pluginName, packCallback)
    })
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