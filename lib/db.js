#! /usr/bin/env node
'use strict'

module.exports = {
    'find': find,
    'insert': insert,
    'update': update,
    'remove': remove,
    'permanentRemove': permanentRemove,
    'createDbConfig': createDbConfig,
    'closeConnection': closeConnection,
    'aggregate': aggregate,
    'sum': sum,
    'avg': avg,
    'max': max,
    'min': min,
    'count': count,
    'preprocessId': preprocessId
}

const process = require('process')
const mongodb = require('mongodb')
const monk = require('monk')
const util = require('./util.js')

const DEFAULT_DB_CONFIG = {
    'mongo_url': '',
    'collection_name': '',
    'history': '_history',
    'deletion_flag_field': '_deleted',
    'id_field': '_id',
    'modification_time_field': '_modified_at',
    'modification_by_field': '_modified_by',
    'process_deleted': false,
    'show_history': false,
    'user_id': '1',
    'persistence_connection': false,
    'verbose': false
}
var DB = null
var lastMongoUrl = null
var lastCollectionName = null
var cachedCollection = null

function preprocessDbConfig (dbConfig) {
    dbConfig = util.patchObject(DEFAULT_DB_CONFIG, dbConfig)
    dbConfig.user_id = preprocessId(dbConfig.user_id)
    return dbConfig
}

function preprocessFilter (dbConfig, filter) {
    let filterCopy = util.deepCopy(filter)
    let multi = true
    dbConfig = preprocessDbConfig(dbConfig)
    if (util.isNullOrUndefined(filterCopy)) {
        filterCopy = {}
    }
    // if filterCopy is string, assume it as primary key value and build appropriate filterCopy
    if (util.isString(filterCopy)) {
        let newfilterCopy = {}
        newfilterCopy[dbConfig.id_field] = filterCopy
        filterCopy = newfilterCopy
    }
    // determine multi
    if (Object.keys(filterCopy).length == 1 && dbConfig.id_field in filterCopy) {
        multi = false
    }
    if (!dbConfig.process_deleted && dbConfig.deletion_flag_field != '') {
                // create "exists" filter
        let existFilter = {}
        existFilter[dbConfig.deletion_flag_field] = 0
                // modify filterCopy
        if (Object.keys(filterCopy).length != 0) {
            filterCopy = {'$and': [existFilter, filterCopy]}
        } else {
            filterCopy = existFilter
        }
    }
    return [filterCopy, multi]
}

function preprocessProjection (dbConfig, projection) {
    let isAdditionalFilterNeeded = true
    if (util.isString(projection)) {
        let fieldList = projection.split(' ')
        for (let i = 0; i < fieldList.length; i++) {
            let field = fieldList[i].trim()
            if (field != '' && field.substring(0, 1) != '-') {
                isAdditionalFilterNeeded = false
                break
            }
        }
        if (isAdditionalFilterNeeded) {
            // don't show deletion
            if (dbConfig.deletion_flag_field != '' && !dbConfig.process_deleted) {
                projection += ' -' + dbConfig.deletion_flag_field
            }
            // don't show history
            if (dbConfig.history != '' && !dbConfig.show_history) {
                projection += ' -' + dbConfig.history
            }
        }
        return projection
    }
    let projectionCopy = util.deepCopy(projection)
    dbConfig = preprocessDbConfig(dbConfig)
    if (util.isNullOrUndefined(projectionCopy)) {
        projectionCopy = {}
    }
    // if not process_deleted, don't show deletion_flag_field
    if (!('fields' in projectionCopy)) {
        projectionCopy['fields'] = {}
    }
    // move every key to fields
    for (let key in projectionCopy) {
        if (key != 'fields' && key != 'rawCursor' && key != 'skip' && key != 'limit' && key != 'sort') {
            projectionCopy['fields'][key] = projectionCopy[key]
            delete projectionCopy[key]
        }
    }
    // determine whether additionalFilter needed or not
    for (let key in projectionCopy['fields']) {
        if (projectionCopy['fields'][key] == 1) {
            isAdditionalFilterNeeded = false
            break
        }
    }
    // add additional filter if necessary
    if (isAdditionalFilterNeeded) {
        if (dbConfig.deletion_flag_field != '' && !dbConfig.process_deleted) {
            projectionCopy['fields'][dbConfig.deletion_flag_field] = 0
        }
        if (dbConfig.history != '' && !dbConfig.show_history) {
            projectionCopy['fields'][dbConfig.history] = 0
        }
    }
    return projectionCopy
}

function preprocessUpdateData (dbConfig, data) {
    let updateData = util.deepCopy(data)
    // determine whether the data contains update operator or not
    let isContainOperator = false
    for (let key in data) {
        if (key[0] == '$') {
            isContainOperator = true
            break
        }
    }
    // if no update operator detected, then put it at $set
    if (!isContainOperator) {
        let newData = {}
        newData['$set'] = data
        updateData = newData
    }
    // copy the data for historical purpose
    let dataCopy = util.deepCopy(updateData)
    // remove $set, $push, and other update operators
    let newDataCopy = {}
    for (let key in dataCopy) {
        if (key[0] == '$') {
            newDataCopy[key.substring(1)] = dataCopy[key]
        } else {
            newDataCopy[key] = dataCopy[key]
        }
    }
    dataCopy = newDataCopy
    // set modifier and modification time
    dataCopy[dbConfig.modification_by_field] = dbConfig.user_id
    dataCopy[dbConfig.modification_time_field] = Date.now()
    // add dataCopy as history
    if (!('$push' in updateData)) {
        updateData['$push'] = {}
    }
    updateData['$push'][dbConfig.history] = dataCopy
    return updateData
}

function preprocessId (id, callback) {
    id = String(id)
    while (id.length < 24) {
        id = '0' + id
    }
    id = id.substring(0, 24)
    return util.runCallbackOrReturn(callback, id)
}

function preprocessSingleInsertData (dbConfig, data) {
    // copy the data for historical purpose
    let insertData = util.deepCopy(data)
    let idField = dbConfig.id_field
    // idField
    if (idField in insertData) {
        insertData[idField] = preprocessId(insertData[idField])
    }
    // copy data
    let dataCopy = util.deepCopy(data)
    let historyData = {'set': dataCopy}
    historyData[dbConfig.modification_by_field] = dbConfig.user_id
    historyData[dbConfig.modification_time_field] = Date.now()
    insertData[dbConfig.history] = [historyData]
    insertData[dbConfig.deletion_flag_field] = 0
    return insertData
}

function preprocessInsertData (dbConfig, data) {
    dbConfig = preprocessDbConfig(dbConfig)
    if (Array.isArray(data)) {
        let newData = []
        for (let i = 0; i < data.length; i++) {
            let doc = data[i]
            newData.push(preprocessSingleInsertData(dbConfig, doc))
        }
        return newData
    }
    return preprocessSingleInsertData(dbConfig, data)
}

function initCollection (dbConfig) {
    let startTime = process.hrtime()
    if (DB == null || lastMongoUrl == null) {
        DB = monk(dbConfig.mongo_url)
        lastMongoUrl = dbConfig.mongo_url
        let elapsedTime = process.hrtime(startTime)
        if (dbConfig.verbose) {
            console.warn('[INFO] Connection openned in: ' + util.formatNanoSecond(elapsedTime) + ' NS')
        }
    }
    if (lastCollectionName != dbConfig.collection_name || cachedCollection == null) {
        startTime = process.hrtime()
        lastCollectionName = dbConfig.collection_name
        cachedCollection = DB.get(lastCollectionName)
        let elapsedTime = process.hrtime(startTime)
        if (dbConfig.verbose) {
            console.warn('[INFO] Collection initialized in: ' + util.formatNanoSecond(elapsedTime) + ' NS')
        }
    }
    return cachedCollection
}

function find (dbConfig, findFilter, projection, callback) {
    if (util.isFunction(findFilter)) {
        callback = findFilter
        findFilter = {}
        projection = {}
    } else if (util.isFunction(projection)) {
        callback = projection
        projection = {}
    }
    let startTime = process.hrtime()
    dbConfig = preprocessDbConfig(dbConfig)
    let collection = initCollection(dbConfig)
    let [filter, multi] = preprocessFilter(dbConfig, findFilter)
    projection = preprocessProjection(dbConfig, projection)
    callback = util.applyShowJsonCallback(callback)
    return collection.find(filter, projection, function (error, docs) {
        let elapsedTime = process.hrtime(startTime)
        if (dbConfig.verbose) {
            console.warn('[INFO] Execute "find" in:' + util.formatNanoSecond(elapsedTime) + ' NS')
        }
        // close the database connection
        if (!dbConfig.persistence_connection) { closeConnection(dbConfig) }
        // ensure that _ids are purely string
        if (Array.isArray(docs)) {
            for (let i = 0; i < docs.length; i++) {
                docs[i][dbConfig.id_field] = String(docs[i][dbConfig.id_field])
            }
            // use doc instead of docs if it is not multi
            if (!multi && docs.length > 0) {
                docs = docs[0]
            }
        }
        callback(error, docs)
    })
}

function preprocessPipeline (dbConfig, pipeline) {
    let newPipeline = []
    if (Array.isArray(pipeline)) {
        newPipeline = util.deepCopy(pipeline)
    }
    if (!dbConfig.process_deleted && dbConfig.deletion_flag_field != '') {
        newPipeline.unshift({'$match': {'_deleted': 0}})
    }
    return newPipeline
}

function aggregate (dbConfig, pipeline, options, callback) {
    if (util.isFunction(options)) {
        callback = options
        options = {}
    }
    let startTime = process.hrtime()
    dbConfig = preprocessDbConfig(dbConfig)
    pipeline = preprocessPipeline(dbConfig, pipeline)
    let collection = initCollection(dbConfig)
    callback = util.applyShowJsonCallback(callback)
    collection.aggregate(pipeline, options, function (error, docs) {
        let elapsedTime = process.hrtime(startTime)
        if (dbConfig.verbose) {
            console.warn('[INFO] Execute "aggregate" in:' + util.formatNanoSecond(elapsedTime) + ' NS')
        }
        // close the database connection
        if (!dbConfig.persistence_connection) { closeConnection(dbConfig) }
        // deal with callback
        callback(error, docs)
    })
}

function preprocessAggregationParameters (dbConfig, filter, groupBy, options, callback) {
    if (util.isFunction(filter)) {
        callback = filter
        filter = null
        groupBy = ''
        options = {}
    } else if (util.isFunction(groupBy)) {
        callback = groupBy
        groupBy = ''
        options = {}
    } else if (util.isFunction(options)) {
        callback = options
        options = {}
    }
    dbConfig = preprocessDbConfig(dbConfig)
    if (groupBy != '') {
        groupBy = '$' + groupBy
    }
    return [filter, groupBy, options, callback]
}

function preprocessAggregationResult (result) {
    if (util.isArray(result)) {
        if (result.length == 1 && result[0]._id == '') {
                        // no grouping
            return result[0].result
        } else {
            let newResult = {}
            for (let i = 0; i < result.length; i++) {
                let row = result[i]
                newResult[row._id] = row.result
            }
            return newResult
        }
    }
    return null
}

function getPipelineByFilter (filter) {
    let pipeline = []
        // if filter is not null, add "match" operation as the first element of pipeline
    if (filter != null) {
        pipeline.push({'$match': filter})
    }
    return pipeline
}

function sum (dbConfig, field, filter, groupBy, options, callback) {
    [filter, groupBy, options, callback] = preprocessAggregationParameters(dbConfig, filter, groupBy, options, callback)
    let pipeline = getPipelineByFilter(filter)
    pipeline.push({'$group': {'_id': groupBy, 'result': {'$sum': '$' + field}}})
    callback = util.applyShowJsonCallback(callback)
    aggregate(dbConfig, pipeline, options, function (error, result) {
        result = preprocessAggregationResult(result)
        callback(error, result)
    })
}

function avg (dbConfig, field, filter, groupBy, options, callback) {
    [filter, groupBy, options, callback] = preprocessAggregationParameters(dbConfig, filter, groupBy, options, callback)
    let pipeline = getPipelineByFilter(filter)
    pipeline.push({'$group': {'_id': groupBy, 'result': {'$avg': '$' + field}}})
    callback = util.applyShowJsonCallback(callback)
    aggregate(dbConfig, pipeline, options, function (error, result) {
        result = preprocessAggregationResult(result)
        callback(error, result)
    })
}

function max (dbConfig, field, filter, groupBy, options, callback) {
    [filter, groupBy, options, callback] = preprocessAggregationParameters(dbConfig, filter, groupBy, options, callback)
    let pipeline = getPipelineByFilter(filter)
    pipeline.push({'$group': {'_id': groupBy, 'result': {'$max': '$' + field}}})
    callback = util.applyShowJsonCallback(callback)
    aggregate(dbConfig, pipeline, options, function (error, result) {
        result = preprocessAggregationResult(result)
        callback(error, result)
    })
}

function min (dbConfig, field, filter, groupBy, options, callback) {
    [filter, groupBy, options, callback] = preprocessAggregationParameters(dbConfig, filter, groupBy, options, callback)
    let pipeline = getPipelineByFilter(filter)
    pipeline.push({'$group': {'_id': groupBy, 'result': {'$min': '$' + field}}})
    callback = util.applyShowJsonCallback(callback)
    aggregate(dbConfig, pipeline, options, function (error, result) {
        result = preprocessAggregationResult(result)
        callback(error, result)
    })
}

function count (dbConfig, filter, groupBy, options, callback) {
    [filter, groupBy, options, callback] = preprocessAggregationParameters(dbConfig, filter, groupBy, options, callback)
    let pipeline = getPipelineByFilter(filter)
    pipeline.push({'$group': {'_id': groupBy, 'result': {'$sum': 1}}})
    callback = util.applyShowJsonCallback(callback)
    aggregate(dbConfig, pipeline, options, function (error, result) {
        result = preprocessAggregationResult(result)
        callback(error, result)
    })
}

function buildFilterForDocs (dbConfig, docs) {
    let findFilter = {}
    if (util.isArray(docs)) {
        findFilter = {'$or': []}
        for (let i = 0; i < docs.length; i++) {
            let doc = docs[i]
            let subfindFilter = {}
            subfindFilter[dbConfig.id_field] = doc[dbConfig.id_field]
            findFilter['$or'].push(subfindFilter)
        }
    } else if (!util.isNullOrUndefined(docs)) {
        findFilter[dbConfig.id_field] = docs[dbConfig.id_field]
    } else {
                // hopefully no one make such a field
        findFilter['_not_exists_' + Math.round(Math.random() * 10000000000)] = false
    }
    return findFilter
}

function insert (dbConfig, data, options, callback) {
    if (typeof (options) === 'function') {
        callback = options
        options = {}
    }
    let startTime = process.hrtime()
    dbConfig = preprocessDbConfig(dbConfig)
    let collection = initCollection(dbConfig)
    data = preprocessInsertData(dbConfig, data)
    callback = util.applyShowJsonCallback(callback)
    return collection.insert(data, options, function (error, docs) {
        let elapsedTime = process.hrtime(startTime)
        if (dbConfig.verbose) {
            console.warn('[INFO] Execute "insert" in: ' + util.formatNanoSecond(elapsedTime) + ' NS')
        }
        // not error
        if (!error) {
            // build the findFilter
            let findFilter = buildFilterForDocs(dbConfig, docs)
            // call find
            find(dbConfig, findFilter, callback)
        } else {
            // close the database connection
            if (!dbConfig.persistence_connection) { closeConnection(dbConfig) }
            // execute callback
            callback(error, null)
        }
    })
}

function update (dbConfig, updateFilter, data, options, callback) {
    if (typeof (options) === 'function') {
        callback = options
        options = {}
    }
    // preprocess options
    if (typeof (options) === 'undefined') {
        options = {}
    }
    options.multi = true
    let startTime = process.hrtime()
    dbConfig = preprocessDbConfig(dbConfig)
    data = preprocessUpdateData(dbConfig, data)
    let [filter, multi] = preprocessFilter(dbConfig, updateFilter)
    callback = util.applyShowJsonCallback(callback)
    let tmpPersistenceConnection = dbConfig.persistence_connection
    dbConfig.persistence_connection = true
    return find(dbConfig, updateFilter, function (error, docs) {
        if (!error) {
                        // build the findFilter
            let findFilter = buildFilterForDocs(dbConfig, docs)
            let collection = initCollection(dbConfig)
            collection.update(filter, data, options, function (error, result) {
                let elapsedTime = process.hrtime(startTime)
                if (dbConfig.verbose) {
                    console.warn('[INFO] Execute "update" in: ' + util.formatNanoSecond(elapsedTime) + ' NS')
                }
                if (!error) {
                    dbConfig.persistence_connection = tmpPersistenceConnection
                    find(dbConfig, findFilter, callback)
                } else {
                                        // close the database connection
                    if (!dbConfig.persistence_connection) { closeConnection(dbConfig) }
                                        // execute callback
                    callback(error, null)
                }
            })
        } else {
                        // close the database connection
            if (!dbConfig.persistence_connection) { closeConnection(dbConfig) }
                        // execute callback
            callback(error, null)
        }
    })
}

function remove (dbConfig, filter, options, callback) {
    dbConfig = preprocessDbConfig(dbConfig)
    dbConfig.process_deleted = true
    let data = {}
    data[dbConfig.deletion_flag_field] = 1
    return update(dbConfig, filter, data, options, callback)
}

function permanentRemove (dbConfig, removeFilter, options, callback) {
    if (typeof (removeFilter) === 'function') {
        callback = removeFilter
        removeFilter = {}
        options = {}
    } else if (typeof (options) === 'function') {
        callback = options
        options = {}
    }
    let startTime = process.hrtime()
    dbConfig = preprocessDbConfig(dbConfig)
    dbConfig.process_deleted = true
    let collection = initCollection(dbConfig)
    let [filter, multi] = preprocessFilter(dbConfig, removeFilter)
    callback = util.applyShowJsonCallback(callback)
    return collection.remove(filter, options, function (err, result) {
        let elapsedTime = process.hrtime(startTime)
        if (dbConfig.verbose) {
            console.warn('[INFO] Execute "permanentRemove" in: ' + util.formatNanoSecond(elapsedTime) + ' NS')
        }
                // close the database connection
        if (!dbConfig.persistence_connection) { closeConnection(dbConfig) }
                // we just want the "ok" and "n" key, not the full buffer, and JSON.parse(JSON.stringify()) solve the problem
        result = JSON.parse(JSON.stringify(result))
                // deal with callback
        callback(err, result)
    })
}

function createDbConfig (mongoUrl, collectionName, userId, callback) {
    let url = 'mongodb://localhost/test'
    if (typeof (mongoUrl) === 'string') {
        url = mongoUrl
    } else if (typeof (mongoUrl) === 'object' && 'mongo_url' in mongoUrl) {
        url = mongoUrl.mongo_url
    }
    let dbConfig = {'mongo_url': url, 'collection_name': collectionName, 'user_id': preprocessId(userId)}
    if (util.isFunction(callback)) {
        return callback(null, JSON.stringify(dbConfig))
    }
    return dbConfig
}

function closeConnection (dbConfig, callback) {
    if (DB != null) {
        DB.close()
        DB = null
        lastMongoUrl = null
        lastCollectionName = null
        cachedCollection = null
        if (dbConfig.verbose) {
            console.warn('[INFO] Connection closed')
        }
        if (typeof (callback) === 'function') {
            return callback(null, true)
        }
    }
}
