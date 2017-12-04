/* eslint-env mocha */

const chai = require('chai')
const assert = chai.assert
const chimera = require('../index.js')
const mongo = chimera.mongo

let softDb = mongo.db('mongodb://localhost/test')
let hardDb = mongo.db('mongodb://localhost/test', {excludeDeleted: false, showHistory: true})
let softGod = mongo.collection(softDb, 'gods')
let hardGod = mongo.collection(hardDb, 'gods')

function closeAll () {
  hardDb.close()
  softDb.close()
}

describe('mongo', function () {
  it('should be able to insert single data', function (done) {
    softGod.insert({name: 'Odin', mythology: 'Nordic', power: 6000}, function (error, result) {
      if (error) {
        return done(error)
      }
      assert.equal(result.name, 'Odin')
      return done()
    })
  })

  it('should be able to insert multiple', function (done) {
    softGod.insert([{name: 'Tyr', mythology: 'Nordic', power: 4000}, {name: 'Posseidon', mythology: 'Greek', power: 3000}, {name: 'Zeus', mythology: 'Greek', power: 7000}], function (error, result) {
      if (error) {
        return done(error)
      }
      assert.equal(result.length, 3)
      return done()
    })
  })

  it('should be able to update', function (done) {
    softGod.update({name: 'Tyr'}, {name: 'Thor'}, function (error, result) {
      if (error) {
        return done(error)
      }
      assert.equal(result.n, 1)
      return done()
    })
  })

  it('should be able to soft remove', function (done) {
    softGod.softRemove({name: 'Posseidon'}, function (error, result) {
      if (error) {
        return done(error)
      }
      assert.equal(result.n, 1)
      return done()
    })
  })

  it('should be able to find (excluding the soft deleted)', function (done) {
    softGod.find({}, function (error, result) {
      if (error) {
        return done(error)
      }
      assert.equal(result.length, 3)
      return done()
    })
  })

  it('should be able to find (including the soft deleted)', function (done) {
    hardGod.find({}, function (error, result) {
      if (error) {
        return done(error)
      }
      assert.equal(result.length, 4)
      return done()
    })
  })

  it('should be able to count (excluding the soft deleted)', function (done) {
    softGod.count({}, function (error, result) {
      if (error) {
        return done(error)
      }
      assert.equal(result, 3)
      return done()
    })
  })

  it('should be able to count (including the soft deleted)', function (done) {
    hardGod.count({}, function (error, result) {
      if (error) {
        return done(error)
      }
      assert.equal(result, 4)
      return done()
    })
  })

  it('should be able to aggregate (excluding the soft deleted)', function (done) {
    softGod.aggregate([{'$group': {'_id': 'count', 'count': {'$sum': 1}}}], function (error, result) {
      if (error) {
        return done(error)
      }
      assert.deepEqual(result, [{'_id': 'count', 'count': 3}])
      return done()
    })
  })

  it('should be able to aggregate (including the soft deleted)', function (done) {
    hardGod.aggregate([{'$group': {'_id': 'count', 'count': {'$sum': 1}}}], function (error, result) {
      if (error) {
        return done(error)
      }
      assert.deepEqual(result, [{'_id': 'count', 'count': 4}])
      return done()
    })
  })

  it('should be able to sum (excluding the soft deleted)', function (done) {
    softGod.sum('power', function (error, result) {
      if (error) {
        return done(error)
      }
      assert.equal(result, 17000)
      return done()
    })
  })

  it('should be able to sum with filter (excluding the soft deleted)', function (done) {
    softGod.sum('power', {'mythology': 'Greek'}, function (error, result) {
      if (error) {
        return done(error)
      }
      assert.equal(result, 7000)
      return done()
    })
  })

  it('should be able to sum with groupBy (excluding the soft deleted)', function (done) {
    softGod.sum('power', {}, 'mythology', function (error, result) {
      if (error) {
        return done(error)
      }
      assert.deepEqual(result, {'Nordic': 10000, 'Greek': 7000})
      return done()
    })
  })

  it('should be able to sum with filter and groupBy (excluding the soft deleted)', function (done) {
    softGod.sum('power', {'mythology': 'Greek'}, 'mythology', function (error, result) {
      if (error) {
        return done(error)
      }
      assert.deepEqual(result, {'Greek': 7000})
      return done()
    })
  })

  it('should be able to sum (including the soft deleted)', function (done) {
    hardGod.sum('power', function (error, result) {
      if (error) {
        return done(error)
      }
      assert.equal(result, 20000)
      return done()
    })
  })

  it('should be able to sum with filter (including the soft deleted)', function (done) {
    hardGod.sum('power', {'mythology': 'Greek'}, function (error, result) {
      if (error) {
        return done(error)
      }
      assert.equal(result, 10000)
      return done()
    })
  })

  it('should be able to sum with groupBy (including the soft deleted)', function (done) {
    hardGod.sum('power', {}, 'mythology', function (error, result) {
      if (error) {
        return done(error)
      }
      assert.deepEqual(result, {'Nordic': 10000, 'Greek': 10000})
      return done()
    })
  })

  it('should be able to sum with filter and groupBy (including the soft deleted)', function (done) {
    hardGod.sum('power', {'mythology': 'Greek'}, 'mythology', function (error, result) {
      if (error) {
        return done(error)
      }
      assert.deepEqual(result, {'Greek': 10000})
      return done()
    })
  })

  it('should be able to avg (excluding the soft deleted)', function (done) {
    softGod.avg('power', function (error, result) {
      if (error) {
        return done(error)
      }
      assert.equal(result, 5666.666666666667)
      return done()
    })
  })

  it('should be able to avg with filter (excluding the soft deleted)', function (done) {
    softGod.avg('power', {'mythology': 'Greek'}, function (error, result) {
      if (error) {
        return done(error)
      }
      assert.equal(result, 7000)
      return done()
    })
  })

  it('should be able to avg with groupBy (excluding the soft deleted)', function (done) {
    softGod.avg('power', {}, 'mythology', function (error, result) {
      if (error) {
        return done(error)
      }
      assert.deepEqual(result, {'Nordic': 5000, 'Greek': 7000})
      return done()
    })
  })

  it('should be able to avg with filter and groupBy (excluding the soft deleted)', function (done) {
    softGod.avg('power', {'mythology': 'Greek'}, 'mythology', function (error, result) {
      if (error) {
        return done(error)
      }
      assert.deepEqual(result, {'Greek': 7000})
      return done()
    })
  })

  it('should be able to avg (including the soft deleted)', function (done) {
    hardGod.avg('power', function (error, result) {
      if (error) {
        return done(error)
      }
      assert.equal(result, 5000)
      return done()
    })
  })

  it('should be able to avg with filter (including the soft deleted)', function (done) {
    hardGod.avg('power', {'mythology': 'Greek'}, function (error, result) {
      if (error) {
        return done(error)
      }
      assert.equal(result, 5000)
      return done()
    })
  })

  it('should be able to avg with groupBy (including the soft deleted)', function (done) {
    hardGod.avg('power', {}, 'mythology', function (error, result) {
      if (error) {
        return done(error)
      }
      assert.deepEqual(result, {'Nordic': 5000, 'Greek': 5000})
      return done()
    })
  })

  it('should be able to avg with filter and groupBy (including the soft deleted)', function (done) {
    hardGod.avg('power', {'mythology': 'Greek'}, 'mythology', function (error, result) {
      if (error) {
        return done(error)
      }
      assert.deepEqual(result, {'Greek': 5000})
      return done()
    })
  })

  it('should be able to min (excluding the soft deleted)', function (done) {
    softGod.min('power', function (error, result) {
      if (error) {
        return done(error)
      }
      assert.equal(result, 4000)
      return done()
    })
  })

  it('should be able to min with filter (excluding the soft deleted)', function (done) {
    softGod.min('power', {'mythology': 'Greek'}, function (error, result) {
      if (error) {
        return done(error)
      }
      assert.equal(result, 7000)
      return done()
    })
  })

  it('should be able to min with groupBy (excluding the soft deleted)', function (done) {
    softGod.min('power', {}, 'mythology', function (error, result) {
      if (error) {
        return done(error)
      }
      assert.deepEqual(result, {'Nordic': 4000, 'Greek': 7000})
      return done()
    })
  })

  it('should be able to min with filter and groupBy (excluding the soft deleted)', function (done) {
    softGod.min('power', {'mythology': 'Greek'}, 'mythology', function (error, result) {
      if (error) {
        return done(error)
      }
      assert.deepEqual(result, {'Greek': 7000})
      return done()
    })
  })

  it('should be able to min (including the soft deleted)', function (done) {
    hardGod.min('power', function (error, result) {
      if (error) {
        return done(error)
      }
      assert.equal(result, 3000)
      return done()
    })
  })

  it('should be able to min with filter (including the soft deleted)', function (done) {
    hardGod.min('power', {'mythology': 'Greek'}, function (error, result) {
      if (error) {
        return done(error)
      }
      assert.equal(result, 3000)
      return done()
    })
  })

  it('should be able to min with groupBy (including the soft deleted)', function (done) {
    hardGod.min('power', {}, 'mythology', function (error, result) {
      if (error) {
        return done(error)
      }
      assert.deepEqual(result, {'Nordic': 4000, 'Greek': 3000})
      return done()
    })
  })

  it('should be able to min with filter and groupBy (including the soft deleted)', function (done) {
    hardGod.min('power', {'mythology': 'Greek'}, 'mythology', function (error, result) {
      if (error) {
        return done(error)
      }
      assert.deepEqual(result, {'Greek': 3000})
      return done()
    })
  })

  it('should be able to max (excluding the soft deleted)', function (done) {
    softGod.max('power', function (error, result) {
      if (error) {
        return done(error)
      }
      assert.equal(result, 7000)
      return done()
    })
  })

  it('should be able to max with filter (excluding the soft deleted)', function (done) {
    softGod.max('power', {'mythology': 'Greek'}, function (error, result) {
      if (error) {
        return done(error)
      }
      assert.equal(result, 7000)
      return done()
    })
  })

  it('should be able to max with groupBy (excluding the soft deleted)', function (done) {
    softGod.max('power', {}, 'mythology', function (error, result) {
      if (error) {
        return done(error)
      }
      assert.deepEqual(result, {'Nordic': 6000, 'Greek': 7000})
      return done()
    })
  })

  it('should be able to max with filter and groupBy (excluding the soft deleted)', function (done) {
    softGod.max('power', {'mythology': 'Greek'}, 'mythology', function (error, result) {
      if (error) {
        return done(error)
      }
      assert.deepEqual(result, {'Greek': 7000})
      return done()
    })
  })

  it('should be able to max (including the soft deleted)', function (done) {
    hardGod.max('power', function (error, result) {
      if (error) {
        return done(error)
      }
      assert.equal(result, 7000)
      return done()
    })
  })

  it('should be able to max with filter (including the soft deleted)', function (done) {
    hardGod.max('power', {'mythology': 'Greek'}, function (error, result) {
      if (error) {
        return done(error)
      }
      assert.equal(result, 7000)
      return done()
    })
  })

  it('should be able to max with groupBy (including the soft deleted)', function (done) {
    hardGod.max('power', {}, 'mythology', function (error, result) {
      if (error) {
        return done(error)
      }
      assert.deepEqual(result, {'Nordic': 6000, 'Greek': 7000})
      return done()
    })
  })

  it('should be able to max with filter and groupBy (including the soft deleted)', function (done) {
    hardGod.max('power', {'mythology': 'Greek'}, 'mythology', function (error, result) {
      if (error) {
        return done(error)
      }
      assert.deepEqual(result, {'Greek': 7000})
      return done()
    })
  })

  it('should be able to find (excluding the soft deleted, via execute)', function (done) {
    mongo.execute({'mongoUrl': 'mongodb://localhost/test', 'collectionName': 'gods'}, 'find', {}, function (error, result) {
      if (error) {
        return done(error)
      }
      assert.equal(result.length, 3)
      return done()
    })
  })

  it('should be able to find (excluding the soft deleted, via $.mongoExecute)', function (done) {
    chimera.coreDollar.mongoExecute({'mongoUrl': 'mongodb://localhost/test', 'collectionName': 'gods'}, 'find', {}, function (error, result) {
      if (error) {
        return done(error)
      }
      assert.equal(result.length, 3)
      return done()
    })
  })

  it('should be able to remove all record', function (done) {
    hardGod.remove({}, function (error, result) {
      if (error) {
        closeAll()
        return done(error)
      }
      assert.equal(result.result.n, 4)
      closeAll()
      return done()
    })
  })
})
