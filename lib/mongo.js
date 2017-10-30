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
    return util.getDeepCopiedObject(query)
  }
  let filterQuery = {'_deleted': 0}
  if (util.isRealObject(query)) {
    return {'$and': [filterQuery, query]}
  }
  return filterQuery
}

function getCompleteOption(option, dbOption) {
  if (dbOption.showHistory) {
    return option
  }
  let filterOption = {'_history': 0}
  if (util.isRealObject(option)) {
    return Object.assign({}, option, filterOption)
  }
  return filterOption
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
    if (method === 'find' && 'option' in args) {
      args.option = getCompleteOption(args.option, dbOption)
    }
    return next(args, method).then((res) => {
      return res
    })
  })
  return db
}

function getManager (url, dbOption) {
  dbOption = getCompleteDbOption(dbOption)
  let db = util.isString(url)? monk(url): url
  db = getManagerWithMiddleware(db, dbOption)
  return db
}

function getCollection (db, name, options) {
  let collection = db.get(name, options)
  collection.softRemove = (query, opts, fn) => {
    let update = {'_deleted': 1}
    return collection.update(query, update, opts, fn)
  }
  return collection
}

if (require.main === module) {
  const async = require('neo-async')
  let softDb = getManager('mongodb://localhost/test')
  let db = getManager('mongodb://localhost/test', {excludeDeleted: false, showHistory: true})
  db = monk('mongodb://localhost/test')
  softDb = monk('mongodb://localhost/other')
  console.error(db._collectionOptions.middlewares === softDb._collectionOptions.middlewares)
  let softTodo = getCollection(softDb, 'todos')
  let todo = getCollection(db, 'todos')
  function errorHandler(error) {
    if (error) {
      console.error('ERROR')
      console.error(error)
    }
    db.close()
    softDb.close()
  }
  async.series([

    (next) => { softTodo.insert({text:'Use Monk'}).then(
      (result) => {
        console.error('SoftTodoInsert (Monk)')
        console.error(result)
        next()
      }, errorHandler
    )},

    (next) => { softTodo.insert([{text:'Use Archer'}, {text:'Use Barbarian'}]).then(
      (result) => {
        console.error('SoftTodoInsert (Archer & Barbarian)')
        console.error(result)
        next()
      }, errorHandler
    )},

    (next) => { softTodo.update({text:'Use Monk'}, {text:'Use Barbarian'}).then(
      (result) => {
        console.error('SoftTodoUpdate (Change Monk into Barbarian)')
        console.error(result)
        next()
      }, errorHandler
    )},

    (next) => { softTodo.softRemove({text:'Use Archer'}).then(
      (result) => {
        console.error('SoftTodoSoftRemove (Archer)')
        console.error(result)
        next()
      }, errorHandler
    )},

    (next) => { softTodo.find().then(
      (result) => {
        console.error('SoftTodoFind')
        console.error(result)
        next()
      }, errorHandler
    )},

    (next) => { todo.find().then(
      (result) => {
        console.error('todoFind')
        console.error(result)
        next()
      }, errorHandler
    )},

    (next) => { todo.remove({}).then(
      (result) => {
        console.error('todoRemove')
        console.error(result.result)
        next()
      }, errorHandler
    )},


  ], (error, result) => {errorHandler(error)})

}
