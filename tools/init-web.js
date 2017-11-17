#! /usr/bin/env node
'use strict'

require('cache-require-paths')
const fse = require('fs-extra')
const async = require('neo-async')
const cmd = require('../lib/cmd.js')
const util = require('../lib/util.js')
const dollar = require('../lib/core-dollar.js')
const path = require('path')

function finalCallback (error, result) {
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
      dollar.prompt('Mongodb Url: (' + defaultMongoUrl + ')', function (error, url) {
        if (error) {
          console.error('[ERROR] Cannot read mongodb url')
          return finalCallback(error)
        }
        if (util.isNullOrUndefined(url) || url === '') {
          mongoUrl = defaultMongoUrl
        } else {
          mongoUrl = url
        }
        callback()
      })
    },

    // read current package.json
    (callback) => {
      util.readJsonFile(path.join(__dirname, '../package.json'), function (error, obj) {
        if (error) {
          console.error('[ERROR] Cannot read chimera-framework\'s package.json')
          return finalCallback(error)
        }
        console.warn('[INFO] Read chimera-framework\'s package.json...')
        chimeraVersion = obj.version
        callback()
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
        console.warn('[INFO] Done copying directory...')
        callback()
      })
    },

    // change directory and rewrite package.json
    (callback) => {
      process.chdir(projectDir)
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
          console.warn('[INFO] Creating new package.json...')
          callback()
        })
      })
    },

    // read and rewrite core.startup.chiml
    (callback) => {
      fse.readFile('chains/core.startup.chiml', function (error, fileContent) {
        if (error) {
          console.error('[ERROR] Cannot read core.startup.chiml')
          return finalCallback(error)
        }
        fileContent = String(fileContent)
        fileContent = fileContent.replace(/mongodb:\/\/localhost\/chimera-web-app/, mongoUrl)
        fse.writeFile('chains/core.startup.chiml', fileContent, function (error, result) {
          if (error) {
            console.error('[ERROR] Cannot write core.startup.chiml')
            return finalCallback(error)
          }
          console.warn('[INFO] Creating new core.startup.chiml...')
          callback()
        })
      })
    },

    // run npm install
    (callback) => {
      cmd.get('npm install', function (error, result) {
        if (error) {
          console.error('[ERROR] Cannot perform npm install')
          finalCallback(error)
        } else {
          console.warn('[INFO] Performing npm install...')
          callback()
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
