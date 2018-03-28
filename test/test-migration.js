/* eslint-env mocha */
const path = require('path')
const chai = require('chai')
const chimera = require('../index.js')
const assert = chai.assert

// 1. upgrade(options, '003', callback): should have 3 records
// 2. downgrade(options, '002', callback): should have 1 records
// 3. upgrade(options, callback): should have 4 records
// 4. downgrade(options, callback): should have 0 records

let migrationPath = path.join(__dirname, 'fractures/migrations')
let mongoUrl = 'mongodb://localhost/test'
let collectionName = 'chimera_migrations'
let migrationConfig = {migrationPath, mongoUrl}
let dbConfig = {mongoUrl, collectionName}
describe('migration', function () {
  it('should be able to upgrade to certain version', function (done) {
    chimera.mongo.execute(dbConfig, 'remove', {}, function (error) {
      if (error) {
        return done(error)
      }
      return chimera.migration.upgrade(migrationConfig, '003', function (error) {
        if (error) {
          return done(error)
        }
        return chimera.mongo.execute(dbConfig, 'count', {}, function (error, result) {
          if (error) {
            return done(error)
          }
          assert.equal(result, 3)
          return done()
        })
      })
    })
  })

  it('should be able to downgrade to certain version', function (done) {
    chimera.migration.downgrade(migrationConfig, '002', function (error) {
      if (error) {
        return done(error)
      }
      return chimera.mongo.execute(dbConfig, 'count', {}, function (error, result) {
        if (error) {
          return done(error)
        }
        assert.equal(result, 1)
        return done()
      })
    })
  })

  it('should be able to upgrade to latest version', function (done) {
    chimera.migration.upgrade(migrationConfig, function (error) {
      if (error) {
        return done(error)
      }
      return chimera.mongo.execute(dbConfig, 'count', {}, function (error, result) {
        if (error) {
          return done(error)
        }
        assert.equal(result, 4)
        return done()
      })
    })
  })

  it('should be able to downgrade to first version', function (done) {
    chimera.migration.downgrade(migrationConfig, function (error) {
      if (error) {
        return done(error)
      }
      return chimera.mongo.execute(dbConfig, 'count', {}, function (error, result) {
        if (error) {
          return done(error)
        }
        assert.equal(result, 0)
        return chimera.mongo.execute(dbConfig, 'remove', {}, function (error) {
          if (error) {
            return done(error)
          }
          return done()
        })
      })
    })
  })
})
