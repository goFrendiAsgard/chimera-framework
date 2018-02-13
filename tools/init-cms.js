#! /usr/bin/env node
'use strict'

require('cache-require-paths')
const fse = require('fs-extra')
const async = require('neo-async')
const cmd = require('../lib/cmd.js')
const util = require('../lib/util.js')
const dollar = require('../lib/core-dollar.js')
const path = require('path')

function finalCallback (error) {
  if (error) {
    console.error(error)
  } else {
    console.warn('Complete...')
  }
}

function initWeb (projectDir) {
  let chimeraVersion, mongoUrl

  async.series([

    // read mongoUrl
    (callback) => {
      let defaultMongoUrl = 'mongodb://localhost/' + projectDir
      dollar.prompt('Mongodb Url (' + defaultMongoUrl + '):', function (error, url) {
        if (error) {
          console.error('[ERROR] Cannot read mongodb url')
          return finalCallback(error)
        }
        if (util.isNullOrUndefined(url) || url === '') {
          mongoUrl = defaultMongoUrl
        } else {
          mongoUrl = url
        }
        return callback()
      })
    },

    // read current package.json
    (callback) => {
      console.warn('[INFO] Read chimera-framework\'s package.json...')
      util.readJsonFile(path.join(__dirname, '../package.json'), function (error, obj) {
        if (error) {
          console.error('[ERROR] Cannot read chimera-framework\'s package.json')
          return finalCallback(error)
        }
        console.warn('[INFO] Done...')
        chimeraVersion = obj.version
        return callback()
      })
    },

    // copy directory
    (callback) => {
      console.warn('[INFO] Copying directory...')
      fse.copy(path.join(__dirname, '../web'), projectDir, function (error) {
        if (error) {
          console.error('[ERROR] Cannot copy directory')
          return finalCallback(error)
        }
        console.warn('[INFO] Done...')
        return callback()
      })
    },

    // change directory and rewrite package.json
    (callback) => {
      process.chdir(projectDir)
      console.warn('[INFO] Creating project\'s package.json...')
      util.readJsonFile('package.json', function (error, obj) {
        if (error) {
          console.error('[ERROR] Cannot read package.json')
          return finalCallback(error)
        }
        // change chimera-framework dependency version and project name
        obj.dependencies['chimera-framework'] = chimeraVersion
        obj.name = projectDir
        // write the new package.json
        util.writeJsonFile('package.json', obj, function (error) {
          if (error) {
            console.error('[ERROR] Cannot write package.json')
            return finalCallback(error)
          }
          console.warn('[INFO] Done...')
          return callback()
        })
      })
    },

    // read and rewrite webConfig.default.js
    (callback) => {
      console.warn('[INFO] Creating webConfig.default.js...')
      fse.readFile('webConfig.default.js', function (error, fileContent) {
        if (error) {
          console.error('[ERROR] Cannot read core.startup.chiml')
          return finalCallback(error)
        }
        fileContent = String(fileContent)
        fileContent = fileContent.replace(/mongodb:\/\/localhost\/chimera-web-app/, mongoUrl)
        fse.writeFile('webConfig.default.js', fileContent, function (error, result) {
          if (error) {
            console.error('[ERROR] Cannot write webConfig.default.js')
            return finalCallback(error)
          }
          console.warn('[INFO] Done...')
          return callback()
        })
      })
    },

    // write webConfig.js
    (callback) => {
      let fileContent = 'const webConfig = require(\'./webConfig.default.js\')\n'
      fileContent += 'webConfig.jwtSecret = \'j' + String(Math.round(Math.random() * 1000000000)) + '\'\n'
      fileContent += 'webConfig.sessionSecret = \'s' + String(Math.round(Math.random() * 1000000000)) + '\'\n'
      fileContent += 'module.exports = webConfig'
      console.warn('[INFO] Creating webConfig.js...')
      fse.writeFile('webConfig.js', fileContent, function (error, result) {
        if (error) {
          console.error('[ERROR] Cannot create webConfig.js')
          return finalCallback(error)
        }
        console.warn('[INFO] Done...')
        return callback()
      })
    },

    // run npm install
    (callback) => {
      console.warn('[INFO] Performing npm install...')
      cmd.get('npm install', function (error) {
        if (error) {
          console.error('[ERROR] Cannot perform npm install')
          return finalCallback(error)
        } else {
          console.warn('[INFO] Done...')
          let content = fse.readFileSync('README.md', 'utf8')
          console.warn(content)
          return callback()
        }
      })
    }

  ], finalCallback)
}

if (require.main === module) {
  if (process.argv.length > 2) {
    let projectDir = process.argv.slice(2).join('_')
    initWeb(projectDir)
  } else {
    console.error('INVALID PARAMETERS')
  }
}
