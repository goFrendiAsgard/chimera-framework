const path = require('path')
const async = require('neo-async')
const core = require('chimera-framework/lib/core.js')
const util = require('chimera-framework/lib/util.js')
const web = require('chimera-framework/lib/web.js')
const mongo = require('chimera-framework/lib/mongo.js')
const port = process.env.PORT || 3000

const webConfig = {
  'startupHook': path.join(__dirname, 'chains/core.startup.chiml'),
  'verbose': 0
}
let app = web.createApp(webConfig)

function migrate (config, callback) {

  let migrationFileList = []
  let processedMigrationList = []
  let cachedMigrationList = []
  let lastCallback = (error, result) => {
    callback(error, processedMigrationList)
  }

  async.series([

    // get migrationFileList
    (next) => {
      fs.readdir(config.migrationPath, (error, fileList) => {
        if (error) {
          return lastCallback(error, null)
        }
        migrationFileList = fileList.filter((fileName) => {
          return fileName !== '.cache.json' && fileName.indexOf('.chiml') > -1
        })
        migrationFileList = migrationFileList.sort()
        next()
      })
    },

    // get cachecMigrationList
    (next) => {
      util.readJsonFile(path.join(config.migrationPath, '.cache.json'), (error, migrationList) => {
        cachedMigrationList = error? []: migrationList
        migrationFileList = migrationFileList.filter((fileName) => {
          return cachedMigrationList.indexOf(fileName) > -1
        })
        next()
      })
    },

    // do the migration
    (next) => {
      let actions = []
      for (let fileName of migrationFileList) {
        actions.push((nextAction) => {
          core.executeChain(path.join(config.migrationPath, fileName), [config], (error, result) => {
            if (!error) {
              processedMigrationList.push(fileName)
            }
            return nextAction
          })
        })
      }
      async.series(actions, next)
    },

    // rewrite cache file
    (next) => {
      let migrationList = util.getDeepCopiedObject(cachedMigrationList)
      for (let fileName of processedMigrationList) {
        migrationList.push(fileName)
      }
      util.writeJsonFile(path.join(config.migrationPath, '.cache.json'), migrationList, (error, result) => {
        if (error) {
          return lastCallback(error, null)
        }
        next()
      })
    }

  ], lastCallback)

}

function registerCollection (config, collectionName, fieldList, callback) {
}

module.exports = {app, migrate, registerCollection}

if (require.main === module) {
  app.listen(port, function () {
    console.error('Start at port ' + port)
  })
}
