'use strict'

module.exports = {
  upgrade,
  downgrade
}

const requireOnce = require('./require-once.js')
let fs, nsync, mongo, path, core, util
const migrationCollectionName = 'chimera_migrations'

function getAvailableMigration (migrationPath, callback) {
  fs = requireOnce('fs')
  fs.readdir(migrationPath, (error, fileList) => {
    if (error) {
      callback(error, null)
    }
    // get migrationList
    let migrationList = []
    for (let i = 0; i < fileList.length; i++) {
      const fileName = fileList[i]
      if (fileName[0] === '.') { continue }
      // remove file extension
      if (fileName.substring(fileName.length - 6) === '.chiml') {
        migrationList.push(fileName.substring(0, fileName.length - 6))
      }
    }
    // sort migrationList
    migrationList = migrationList.sort()
    callback(null, migrationList)
  })
}

function getCachedMigration (mongoUrl, callback) {
  mongo = requireOnce('./mongo.js')
  const db = mongo.db(mongoUrl)
  const migration = mongo.collection(db, migrationCollectionName)
  migration.find({}, function (error, result) {
    if (error) {
      db.close()
      return callback(error, null)
    }
    let migrationList = []
    for (let i = 0; i < result.length; i++) {
      const row = result[i]
      migrationList.push(row.code)
    }
    migrationList = migrationList.sort()
    db.close()
    return callback(null, migrationList)
  })
}

function unpackMigrationParameters (args) {
  // argument of this function: <options> [version] <callback>
  const callback = args.pop()
  let version = null
  if (args.length === 2) {
    version = args.pop()
  }
  const config = args[0]
  const migrationPath = ('migrationPath' in config) ? config.migrationPath : 'migrations'
  const mongoUrl = ('mongoUrl' in config) ? config.mongoUrl : 'mongodb://localhost/db'
  return {version, mongoUrl, migrationPath, config, callback}
}

function filterMigrationList (migrationList, exceptionList, filterFunction) {
  let filteredList = []
  for (let i = 0; i < migrationList.length; i++) {
    const migration = migrationList[i]
    if (filterFunction === null || filterFunction(migration)) {
      if (exceptionList.indexOf(migration) === -1) {
        filteredList.push(migration)
      }
    }
  }
  return filteredList
}

function upgrade (...args) {
  mongo = requireOnce('./mongo.js')
  nsync = requireOnce('neo-async')
  path = requireOnce('path')
  core = requireOnce('./core.js')
  const {version, mongoUrl, migrationPath, config, callback} = unpackMigrationParameters(args)
  let cachedMigrationList, availableMigrationList
  let upgradeMigrationList = []
  let performedMigrationList = []
  let db = mongo.db(mongoUrl)
  let finalCallback = (error) => {
    db.close()
    if (error) {
      return callback(error, null)
    }
    return callback(error, performedMigrationList)
  }
  nsync.series([
    // get cachedMigrationList
    (next) => {
      getCachedMigration(mongoUrl, (error, migrationList) => {
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
      upgradeMigrationList = filterMigrationList(availableMigrationList, cachedMigrationList, (migration) => {
        util = requireOnce('./util.js')
        return util.isNullOrUndefined(version) || migration <= version
      })
      next()
    },
    // do migration
    (next) => {
      const migration = mongo.collection(db, migrationCollectionName)
      let actions = []
      for (let i = 0; i < upgradeMigrationList.length; i++) {
        const migrationName = upgradeMigrationList[i]
        actions.push((nextAction) => {
          core.executeChain(path.join(migrationPath, migrationName + '.chiml'), ['up', config], config.vars, (error) => {
            if (!error) {
              performedMigrationList.push(migrationName)
              return migration.insert({'code': migrationName}, (error) => {
                if (error) {
                  console.error(error)
                }
                return nextAction()
              })
            } else {
              console.error(error)
              return nextAction()
            }
          })
        })
      }
      nsync.series(actions, next)
    }
  ], finalCallback)
}

function downgrade (...args) {
  mongo = requireOnce('./mongo.js')
  path = requireOnce('path')
  core = requireOnce('./core.js')
  const {version, mongoUrl, migrationPath, config, callback} = unpackMigrationParameters(args)
  const db = mongo.db(mongoUrl)
  let cachedMigrationList, availableMigrationList
  let downgradeMigrationList = []
  let performedMigrationList = []
  let finalCallback = (error) => {
    db.close()
    if (error) {
      return callback(error, null)
    }
    return callback(error, performedMigrationList)
  }
  nsync = requireOnce('neo-async')
  nsync.series([
    // get cachedMigrationList
    (next) => {
      getCachedMigration(mongoUrl, (error, migrationList) => {
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
    // get downgradeMigrationList
    (next) => {
      downgradeMigrationList = filterMigrationList(cachedMigrationList, [], (migration) => {
        util = requireOnce('./util.js')
        return util.isNullOrUndefined(version) || migration >= version
      })
      downgradeMigrationList = downgradeMigrationList.sort((a, b) => {
        return a < b ? 1 : -1
      })
      next()
    },
    // do migration
    (next) => {
      const migration = mongo.collection(db, migrationCollectionName)
      let actions = []
      for (let i = 0; i < downgradeMigrationList.length; i++) {
        const migrationName = downgradeMigrationList[i]
        if (availableMigrationList.indexOf(migrationName) < 0) {
          continue
        }
        actions.push((nextAction) => {
          core.executeChain(path.join(migrationPath, migrationName + '.chiml'), ['down', config], config.vars, (error) => {
            if (!error) {
              performedMigrationList.push(migrationName)
              return migration.remove({'code': migrationName}, (error) => {
                if (error) {
                  console.error(error)
                }
                return nextAction()
              })
            } else {
              console.error(error)
              return nextAction()
            }
          })
        })
      }
      nsync.series(actions, next)
    }
  ], finalCallback)
}
