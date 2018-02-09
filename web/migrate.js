'use strict'

const migration = require('chimera-framework/lib/migration.js')
const util = require('chimera-framework/lib/util.js')
const helper = require('./helper.js')
const cck = require('./cck.js')

let executors = {
  up: migration.upgrade,
  down: migration.downgrade
}

function migrate (action, version, customWebConfig) {
  let webConfig = helper.getWebConfig()
  // load webConfig
  if (!util.isNullOrUndefined(customWebConfig)) {
    webConfig = util.getPatchedObject(webConfig, customWebConfig)
  } 
  // add `helper` and `cck` to webConfig.vars.$
  webConfig.vars = 'vars' in webConfig ? webConfig.vars : {}
  webConfig.vars.$ = '$' in webConfig.vars ? webConfig.vars.$ : {}
  webConfig.vars.$.helper = helper
  webConfig.vars.$.cck = cck
  // execute
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
  let customWebConfig = process.argv.length > 4 ? JSON.parse(process.argv[4]) : null
  let version = process.argv.length > 3 ? process.argv[3] : null
  let action = process.argv.length > 2 ? process.argv[2] : 'up'
  try {
    customWebConfig = JSON.parse(version)
    version = null
  } catch (error) {
    // do nothing
  }
  // execute upgrade or downgrade
  migrate(action, version, customWebConfig)
}