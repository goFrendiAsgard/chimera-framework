const path = require('path')
const migration = require('chimera-framework/lib/migration.js')
const helper = require('./helper.js')

// load webConfig
let webConfig = helper.getWebConfig()

// define default parameters
let migrationConfig = {
  migrationPath: webConfig.migrationPath,
  mongoUrl: webConfig.mongoUrl,
  cckPath: path.join(__dirname, 'cck.js')
}
let version = null
let action = 'up'
let executors = {
  up: migration.upgrade,
  down: migration.downgrade
}

function migrate (action, version) {
  executors[action](migrationConfig, version, function (error, result) {
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
