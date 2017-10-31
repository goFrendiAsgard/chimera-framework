#! /usr/bin/env node
'use strict'

const monk = require('monk')
const util = require('./util.js')

module.exports = {
  'db': getManager,
  'collection': getCollection
}

function getCompleteDbOption (dbOption) {
  let completeOption = {
    'user': util.getStretchedString('0', 24, '0'),
    'excludeDeleted': true,
    'showHistory': false
  }
  if (util.isRealObject(dbOption)) {
    for (let key in completeOption) {
      if (key in dbOption) {
        completeOption[key] = dbOption[key]
      }
    }
  }
  return completeOption
}

function getCompleteInsertData(data, dbOption) {
  if (util.isArray(data)) {
    for(let value of data) {
      value = getCompleteInsertData(value, dbOption)
    }
    return data
  }
  data._muser = dbOption.user
  data._mtime = String(Date.now())
  data._deleted = 0
  let historyData = util.getDeepCopiedObject(data)
  data._history = [{'set': historyData}]
  return data
}

function getCompleteUpdateData(data, dbOption) {
  let completeData = {
    '$set': {},
    '$push': {}
  }
  for (let key in data) {
    if (key.indexOf('$') === 0) {
      completeData[key] = data[key]
    } else {
      completeData.$set[key] = data[key]
    }
  }
  completeData.$set._muser = dbOption.user
  completeData.$set._mtime = String(Date.now())
  let historyData = {}
  for (let key in completeData) {
    let strippedKey = key.replace(/^\$(.*)$/g, '$1')
    historyData[strippedKey] = util.getDeepCopiedObject(completeData[key])
  }
  completeData.$push._history = historyData
  // console.error(completeData)
  return completeData
}

function getCompleteQuery(query, dbOption) {
  if (!dbOption.excludeDeleted) {
    return query
  }
  let filterQuery = {'_deleted': 0}
  if (util.isRealObject(query)) {
    return {'$and': [filterQuery, query]}
  }
  return filterQuery
}

function getCompleteOptions(options, dbOption) {
  if (dbOption.showHistory) {
    return options
  }
  let filterOptions = {'_history': 0}
  if (util.isRealObject(options)) {
    return Object.assign({}, options, filterOptions)
  }
  return filterOptions
}

function getCompleteStages(stages, dbOption) {
  if (!dbOption.excludeDeleted) {
    return stages
  }
  let filterStage = {'$match': {'_deleted': 0}}
  if (util.isArray(stages)) {
    let completeStages = util.getDeepCopiedObject(stages)
    completeStages.unshift(filterStage)
    return completeStages
  }
  return [filterStage]
}

function getAggregationResult (res) {
  if (res.length === 1 && '_id' in res[0] && res[0]._id === '_aggregate' && '_result' in res[0]) {
    res = res[0]._result
  } else if(res.length >= 1 && '_id' in res[0] && '_result' in res[0]) {
    let newRes = {}
    for (let i=0; i<res.length; i++) {
      newRes[res[i]._id] = res[i]._result
    }
    res = newRes
  }
  return res
}

function getManagerWithMiddleware(db, dbOption) {
  db.addMiddleware(context => next => (args, method) => {
    if (method === 'insert' && 'data' in args) {
      args.data = getCompleteInsertData(args.data, dbOption)
    }
    if (method === 'update' && 'update' in args) {
      args.update = getCompleteUpdateData(args.update, dbOption)
    }
    if ('query' in args) {
      args.query = getCompleteQuery(args.query, dbOption)
    }
    if (method === 'find' && 'options' in args) {
      args.options = getCompleteOptions(args.options, dbOption)
    }
    if (method === 'aggregate' && 'stages' in args) {
      args.stages = getCompleteStages(args.stages, dbOption)
    }
    return next(args, method).then((res) => {
      if (method === 'aggregate' && util.isArray(res)) {
        res = getAggregationResult(res)
      }
      return res
    })
  })
  return db
}

function getManager (url, dbOption) {
  dbOption = getCompleteDbOption(dbOption)
  let db = util.isString(url)? monk(url): url
  db._collectionOptions.middlewares = util.getDeepCopiedObject(db._collectionOptions.middlewares)
  db = getManagerWithMiddleware(db, dbOption)
  return db
}

function getCollectionWithSoftRemove (collection) {
  collection.softRemove = (query, opts, fn) => {
    let update = {'_deleted': 1}
    return collection.update(query, update, opts, fn)
  }
  return collection
}

function getCollectionWithSimpleAggregate (collection) {
  // min
  collection.min = (field, filter, groupBy) => {
    groupBy = util.isNullOrUndefined(groupBy)? '_aggregate': '$'+groupBy
    filter = util.isNullOrUndefined(filter)? {}: filter
    let pipeline = [{'$match':filter}, {'$group':{'_id':groupBy, '_result':{'$min':'$'+field}}}]
    return collection.aggregate(pipeline)
  }
  // max
  collection.max = (field, filter, groupBy) => {
    groupBy = util.isNullOrUndefined(groupBy)? '_aggregate': '$'+groupBy
    filter = util.isNullOrUndefined(filter)? {}: filter
    let pipeline = [{'$match':filter}, {'$group':{'_id':groupBy, '_result':{'$max':'$'+field}}}]
    return collection.aggregate(pipeline)
  }
  // avg
  collection.avg = (field, filter, groupBy) => {
    groupBy = util.isNullOrUndefined(groupBy)? '_aggregate': '$'+groupBy
    filter = util.isNullOrUndefined(filter)? {}: filter
    let pipeline = [{'$match':filter}, {'$group':{'_id':groupBy, '_result':{'$avg':'$'+field}}}]
    return collection.aggregate(pipeline)
  }
  // sum
  collection.sum = (field, filter, groupBy) => {
    groupBy = util.isNullOrUndefined(groupBy)? '_aggregate': '$'+groupBy
    filter = util.isNullOrUndefined(filter)? {}: filter
    let pipeline = [{'$match':filter}, {'$group':{'_id':groupBy, '_result':{'$sum':'$'+field}}}]
    return collection.aggregate(pipeline)
  }
  return collection
}

function getCollection (db, name, options) {
  let collection = db.get(name, options)
  collection = getCollectionWithSoftRemove(collection)
  collection = getCollectionWithSimpleAggregate(collection)
  return collection
}

if (require.main === module) {

  const async = require('neo-async')
  let softDb = getManager('mongodb://localhost/test')
  let db = getManager('mongodb://localhost/test', {excludeDeleted: false, showHistory: true})
  let softGod = getCollection(softDb, 'gods')
  let god = getCollection(db, 'gods')

  function errorHandler(error) {
    if (error) {
      console.error('ERROR')
      console.error(error)
    }
    db.close()
    softDb.close()
  }

  async.series([

    (next) => { softGod.insert({name: 'Odin', mythology: 'Nordic', power: 6000}).then(
      (result) => {
        console.error('SoftGodInsert (Odin)')
        console.error(result)
        next()
      }, errorHandler
    )},

    (next) => { softGod.insert([{name: 'Tyr', mythology: 'Nordic', power: 4000}, {name: 'Posseidon', mythology: 'Greek', power:3000}, {name: 'Zeus', mythology: 'Greek', power: 7000}]).then(
      (result) => {
        console.error('SoftGodInsert (Tyr & Zeus)')
        console.error(result)
        next()
      }, errorHandler
    )},

    (next) => { softGod.update({name:'Tyr'}, {name:'Thor'}).then(
      (result) => {
        console.error('SoftGodUpdate (Change Tyr into Thor)')
        console.error(result)
        next()
      }, errorHandler
    )},

    (next) => { softGod.softRemove({name:'Posseidon'}).then(
      (result) => {
        console.error('SoftGodSoftRemove (Posseidon)')
        console.error(result)
        next()
      }, errorHandler
    )},

    (next) => { softGod.find().then(
      (result) => {
        console.error('SoftGodFind')
        console.error(result)
        next()
      }, errorHandler
    )},

    (next) => { god.find().then(
      (result) => {
        console.error('godFind')
        console.error(result)
        next()
      }, errorHandler
    )},

    (next) => { softGod.count().then(
      (result) => {
        console.error('SoftGodCount')
        console.error(result)
        next()
      }, errorHandler
    )},

    (next) => { softGod.aggregate([{"$group":{"_id":"count","count":{"$sum":1}}}]).then(
      (result) => {
        console.error('SoftGodAggregate')
        console.error(result)
        next()
      }, errorHandler
    )},

    (next) => { softGod.sum('power').then(
      (result) => {
        console.error('SoftGodSum')
        console.error(result)
        next()
      }, errorHandler
    )},

    (next) => { softGod.sum('power', {}, 'mythology').then(
      (result) => {
        console.error('SoftGodSum By Mythology')
        console.error(result)
        next()
      }, errorHandler
    )},

    (next) => { softGod.avg('power').then(
      (result) => {
        console.error('SoftGodAvg')
        console.error(result)
        next()
      }, errorHandler
    )},

    (next) => { softGod.avg('power', {}, 'mythology').then(
      (result) => {
        console.error('SoftGodAvg By Mythology')
        console.error(result)
        next()
      }, errorHandler
    )},

    (next) => { softGod.min('power').then(
      (result) => {
        console.error('SoftGodMin')
        console.error(result)
        next()
      }, errorHandler
    )},

    (next) => { softGod.min('power', {}, 'mythology').then(
      (result) => {
        console.error('SoftGodMin By Mythology')
        console.error(result)
        next()
      }, errorHandler
    )},

    (next) => { softGod.max('power').then(
      (result) => {
        console.error('SoftGodMax')
        console.error(result)
        next()
      }, errorHandler
    )},

    (next) => { softGod.max('power', {}, 'mythology').then(
      (result) => {
        console.error('SoftGodMax By Mythology')
        console.error(result)
        next()
      }, errorHandler
    )},

    (next) => { god.remove({}).then(
      (result) => {
        console.error('godRemove')
        console.error(result.result)
        next()
      }, errorHandler
    )},

  ], (error, result) => {errorHandler(error)})

}
