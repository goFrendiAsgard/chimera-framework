#! /usr/bin/env node
'use strict'

require('cache-require-paths')
const fs = require('fs')
const nsync = require('neo-async')
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

  nsync.series([

    // read mongoUrl
    (callback) => {
      const defaultMongoUrl = 'mongodb://localhost/' + projectDir
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
      console.warn('[INFO] Clone CMS...')
      cmd.get('git clone --depth 1 https://github.com/goFrendiAsgard/chimera-cms ' + projectDir, function (error) {
        if (error) {
          console.error('[ERROR] Cannot clone CMS. Make sure you have git installed and you are connected to the internet')
          return finalCallback(error)
        } else {
          console.warn('[INFO] Done...')
          return callback()
        }
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
        util.writePrettyJsonFile('package.json', obj, function (error) {
          if (error) {
            console.error('[ERROR] Cannot write package.json')
            return finalCallback(error)
          }
          console.warn('[INFO] Done...')
          return callback()
        })
      })
    },

    // write webConfig.js
    (callback) => {
      const fileContent = 'module.exports = {}'
      console.warn('[INFO] Creating webConfig.js...')
      fs.writeFile('webConfig.js', fileContent, function (error) {
        if (error) {
          console.error('[ERROR] Cannot create webConfig.js')
          return finalCallback(error)
        }
        console.warn('[INFO] Done...')
        return callback()
      })
    },

    // write webConfig.json
    (callback) => {
      const obj = {
        jwtSecret: 'j' + String(Math.round(Math.random() * 1000000000)),
        sessionSecret: 's' + String(Math.round(Math.random() * 1000000000)),
        mongoUrl: mongoUrl,
        port: 3000
      }
      const fileContent = JSON.stringify(obj, null, 2)
      console.warn('[INFO] Creating webConfig.json...')
      fs.writeFile('webConfig.json', fileContent, function (error) {
        if (error) {
          console.error('[ERROR] Cannot create webConfig.json')
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
          return callback()
        }
      })
    },

    // run migration
    (callback) => {
      console.warn('[INFO] Performing migration...')
      const { migrate } = require(path.join(process.cwd(), 'migrate.js'))
      migrate('up', null, null, callback)
    }

  ], finalCallback)
}

if (require.main === module) {
  if (process.argv.length > 2) {
    const projectDir = process.argv.slice(2).join('_')
    initWeb(projectDir)
  } else {
    console.error('INVALID PARAMETERS')
  }
}
