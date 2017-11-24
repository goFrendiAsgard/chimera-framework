const fs = require('fs')
const path = require('path')
const async = require('neo-async')
const core = require('../core.js')
const mongo = require('../mongo.js')

module.exports = {
  getAvailableMigration,
  getCachedMigration,
  upgrade,
  downgrade
}

function getAvailableMigration (migrationPath, callback) {
  fs.readdir(migrationPath, (error, fileList) => {
    if (error) {
      callback(error, null)
    }
    // get migrationList
    let migrationList = []
    for (let fileName in fileList) {
      // remove file extension
      if (fileName.substring(fileName.length - 6) === '.chiml') {
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
      callback(error, null)
    }
    let migrationList = []
    for (let row of result) {
      migrationList.append(row.code)
    }
    migrationList = migrationList.sort()
    callback(null, migrationList)
  })
}

function unpackMigrationParameters (args) {
  let callback = args.pop()
  let config = args.pop()
  let migrationPath = args.pop()
  let dbUrl = args.pop()
  let version = null
  if (args.length === 1) {
    version = args[1]
  }
  return {version, dbUrl, migrationPath, config, callback}
}

function upgrade (...args) {
  let {version, dbUrl, migrationPath, config, callback} = unpackMigrationParameters(args)
  let cachedMigrationList, availableMigrationList
  let upgradeMigrationList = []
  let performedMigrationList = []
  let finalCallback = (error, value) => {
    if (error) {
      return callback(error, null)
    }
    return callback(error, performedMigrationList)
  }
  async.series([
    // get cachedMigrationList
    (next) => {
      getCachedMigration(dbUrl, (error, migrationList) => {
        if (error) {
          return finalCallback(error, null)
        }
        cachedMigrationList = migrationList
        return next()
      })
    },
    // get availableMigrationList
    (next) => {
      getAvailableMigration(migrationPath, (error, migrationList) => {
        if (error) {
          return finalCallback(error, null)
        }
        availableMigrationList = migrationList
        return next()
      })
    },
    // get upgradeMigrationList
    (next) => {
      for (let migration of availableMigrationList) {
        if (version === null || migration <= version) {
          if (cachedMigrationList.indexOf(migration) > -1) {
            upgradeMigrationList.push(migration)
          }
        }
      }
      next()
    },
    // do migration
    (next) => {
      let actions = []
      for (let migration of upgradeMigrationList) {
        actions.push((nextAction) => {
          core.executeChain(path.join(migrationPath, migration + '.chiml'), [config], (error, result) => {
            if (!error) {
              performedMigrationList.push(migration)
            }
            return nextAction()
          })
        })
      }
      async.series(actions, next)
    }
  ], finalCallback)
}

function downgrade (...args) {
  let {version, dbUrl, migrationPath, config, callback} = unpackMigrationParameters(args)
}
