'use strict'
require('cache-require-paths')

const monk = require('monk')
const util = require('./util.js')

const COLOR_FG_YELLOW = '\x1b[33m'
const COLOR_RESET = '\x1b[0m'
const DEFAULT_DB_OPTION = {
  'user': util.getStretchedString('0', 24, '0'),
  'excludeDeleted': true,
  'showHistory': false
}

module.exports = {
  'db': getCompleteManager,
  'collection': getCompleteCollection,
  'execute': execute
}

// run something and close the db manager afterward
function execute (configs, fn, ...args) {
  if ('verbose' in configs && configs.verbose) {
    let isoDate = (new Date()).toISOString()
    console.error(COLOR_FG_YELLOW + '[' + isoDate + '] Start mongo.execute: ' + JSON.stringify([configs, fn, args]) + COLOR_RESET)
  }
  let dbConfigs = util.getDeepCopiedObject(configs)
  let mongoUrl = 'mongoUrl' in dbConfigs ? dbConfigs.mongoUrl : ''
  let dbOption = 'dbOption' in dbConfigs ? dbConfigs.dbOption : {}
  let options = 'options' in dbConfigs ? dbConfigs.options : {}
  let collectionName = 'collectionName' in dbConfigs ? dbConfigs.collectionName : ''
  delete dbConfigs.mongoUrl
  delete dbConfigs.dbOption
  delete dbConfigs.collectionName
  let manager
  // wrap last argument in newCallback
  let callback = args[args.length - 1]
  let newCallback = (error, result) => {
    if ('verbose' in configs && configs.verbose) {
      let isoDate = (new Date()).toISOString()
      console.error(COLOR_FG_YELLOW + '[' + isoDate + '] Finish mongo.execute: ' + JSON.stringify([configs, fn, args]) + COLOR_RESET)
    }
    manager.close()
    callback(error, result)
  }
  args[args.length - 1] = newCallback
  manager = getCompleteManager(mongoUrl, dbOption, options, (error, manager) => {
    if (error) {
      return newCallback(error)
    }
    let collection = getCompleteCollection(manager, collectionName, dbConfigs)
    try {
      return collection[fn](...args)
    } catch (error) {
      return newCallback(error)
    }
  })
}

function getCompleteDbOption (dbOption) {
  return util.getPatchedObject(DEFAULT_DB_OPTION, dbOption)
}

function getCompleteInsertData (data, dbOption) {
  if (util.isArray(data)) {
    for (let value of data) {
      value = getCompleteInsertData(value, dbOption)
    }
    return data
  }
  data._muser = dbOption.user
  data._mtime = String(Date.now())
  data._deleted = 0
  let historyData = util.getDeepCopiedObject(data)
  data._history = [JSON.stringify(historyData)]
  return data
}

function getCompleteUpdateData (data, dbOption) {
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
  let historyData = util.getDeepCopiedObject(data)
  completeData.$push._history = JSON.stringify(historyData)
  return completeData
}

function getCompleteQuery (query, dbOption) {
  if (!dbOption.excludeDeleted) {
    return query
  }
  let filterQuery = {'_deleted': 0}
  if (util.isRealObject(query)) {
    return {'$and': [filterQuery, query]}
  }
  return filterQuery
}

function getCompleteOptions (options, dbOption) {
  if (dbOption.showHistory) {
    return options
  }
  let filterOptions = {'fields': {'_history': 0}}
  if (util.isRealObject(options)) {
    if ('fields' in options && util.isRealObject(options.fields)) {
      for (let fieldName in options.fields) {
        if (options.fields[fieldName] === 1) {
          return options
        }
      }
      return util.getPatchedObject(options, filterOptions)
    }
  }
  return filterOptions
}

function getCompleteStages (stages, dbOption) {
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
  } else if (res.length >= 1 && '_id' in res[0] && '_result' in res[0]) {
    let newRes = {}
    for (let i = 0; i < res.length; i++) {
      newRes[res[i]._id] = res[i]._result
    }
    res = newRes
  }
  return res
}

function getManagerWithMiddleware (db, dbOption) {
  db._collectionOptions.middlewares = util.getDeepCopiedObject(db._collectionOptions.middlewares)
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

function getCompleteManager (url, dbOption, options = {}, callback) {
  dbOption = getCompleteDbOption(dbOption)
  let db
  if (util.isString(url)) {
    db = monk(url, options, (error, db) => {
      if (util.isFunction(callback)) {
        db = getManagerWithMiddleware(db, dbOption)
        callback(error, db)
      }
    })
  } else {
    db = url
  }
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

function getSimpleAggregateParam (field, filter, groupBy, fn) {
  let defaultGroupBy = '_aggregate'
  let defaultFilter = {}
  if (util.isFunction(filter)) {
    fn = filter
    filter = defaultFilter
    groupBy = defaultGroupBy
  } else if (util.isFunction(groupBy)) {
    fn = groupBy
    groupBy = defaultGroupBy
  } else {
    groupBy = '$' + groupBy
  }
  return {field, filter, groupBy, fn}
}

function getCollectionWithSimpleAggregate (collection) {
  // min
  collection.min = (field, filter, groupBy, fn) => {
    ({field, filter, groupBy, fn} = getSimpleAggregateParam(field, filter, groupBy, fn))
    let pipeline = [{'$match': filter}, {'$group': {'_id': groupBy, '_result': {'$min': '$' + field}}}]
    return collection.aggregate(pipeline, fn)
  }
  // max
  collection.max = (field, filter, groupBy, fn) => {
    ({field, filter, groupBy, fn} = getSimpleAggregateParam(field, filter, groupBy, fn))
    let pipeline = [{'$match': filter}, {'$group': {'_id': groupBy, '_result': {'$max': '$' + field}}}]
    return collection.aggregate(pipeline, fn)
  }
  // avg
  collection.avg = (field, filter, groupBy, fn) => {
    ({field, filter, groupBy, fn} = getSimpleAggregateParam(field, filter, groupBy, fn))
    let pipeline = [{'$match': filter}, {'$group': {'_id': groupBy, '_result': {'$avg': '$' + field}}}]
    return collection.aggregate(pipeline, fn)
  }
  // sum
  collection.sum = (field, filter, groupBy, fn) => {
    ({field, filter, groupBy, fn} = getSimpleAggregateParam(field, filter, groupBy, fn))
    let pipeline = [{'$match': filter}, {'$group': {'_id': groupBy, '_result': {'$sum': '$' + field}}}]
    return collection.aggregate(pipeline, fn)
  }
  return collection
}

function getCompleteCollection (db, name, options) {
  let collection = db.get(name, options)
  collection = getCollectionWithSoftRemove(collection)
  collection = getCollectionWithSimpleAggregate(collection)
  return collection
}
