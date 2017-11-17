const fs = require('fs')
const path = require('path')
const async = require('neo-async')
const core = require('../core.js')
const util = require('../util.js')
const mongo = require('../mongo.js')

module.exports = {
  getAvailableMigration,
  getCachedMigration,
  upgrade,
  downgrade,
}

function getAvailableMigration (migrationPath, callback) {
  fs.readdir(migrationPath, (error, fileList) => {
    if (error) {
      callback (error, null)
    }
    // get migrationList
    let migrationList = []
    for (let fileName in fileList) {
      if(substring(fileName, fileName.length - 6) == '.chiml') {
        migrationList.append(fileName.substring(0, fileName.length - 6))
      }
    }
    // sort migrationList
    migrationList = migrationList.sort()
    callback(null, migrationList)
  })
}

function getCachedMigration (dbUrl, callback) {
  let db = mongo.db(dbUrl)
  let migration = mongo.collection(db, '_migration')
  migration.find({}, function (error, result) {
    if (error) {
      callback (error, null)
    }
    let migrationList = []
    for (let row of result) {
      migrationList.append(row.code)
    }
    callback(null, migrationList)
  })
}

function unpackMigrationParameters(args) {
  let callback = args.pop()
  let version = null
  if (args.length == 1) {
    version = args[1]
  }
  return {version, callback}
}

function upgrade (...args) {
  let {version, callback} = unpackMigrationParameters(args)
}

function downgrade (...args) {
  let {version, callback} = unpackMigrationParameters(args)
}


function migrate (migrationPath, callback) {

  let migrationFileList = []
  let processedMigrationList = []
  let cachedMigrationList = []
  let lastCallback = (error, result) => {
    callback(error, processedMigrationList)
  }

  async.series([

    // get migrationFileList
    (next) => {
      fs.readdir(migrationPath, (error, fileList) => {
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
      util.readJsonFile(path.join(migrationPath, '.cache.json'), (error, migrationList) => {
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
          core.executeChain(path.join(migrationPath, fileName), [config], (error, result) => {
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
      util.writeJsonFile(path.join(migrationPath, '.cache.json'), migrationList, (error, result) => {
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
