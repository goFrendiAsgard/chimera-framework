'use strict'

const path = require('path')
const migration = require('chimera-framework/lib/migration.js')
const helper = require('./helper.js')
const cck = require('./cck.js')

// load webConfig
let webConfig = helper.getWebConfig()
// add `helper` and `cck` to webConfig.vars.$
webConfig.vars = 'vars' in webConfig? webConfig.vars: {}
webConfig.vars.$ = '$' in webConfig.vars? webConfig.vars.$: {}
webConfig.vars.$.helper = helper
webConfig.vars.$.cck = cck

let version = null
let action = 'up'
let executors = {
  up: migration.upgrade,
  down: migration.downgrade
}

function migrate (action, version) {
  executors[action](webConfig, version, function (error, result) {
    if (error) {
      console.error(error)
    } else {
      console.warn('[INFO] Migration succeed')
      for (let version of result) {
        console.warn(' * ' + version + ' ' + action)
      }
    }
  })
}

module.exports = {migrate}

if (require.main === module) {
  // get action and version
  if (process.argv.length > 3) {
    action = process.argv[2]
    version = process.argv[3]
  } else if (process.argv.length > 2) {
    action = process.argv[2]
  }
  // execute upgrade or downgrade
  migrate (action, version)
}
