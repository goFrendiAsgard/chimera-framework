#! /usr/bin/env node
'use strict';

const process = require('process')
const mongodb = require('mongodb')
const monk = require('monk')
const chimera = require('chimera-framework/core')


const DEFAULT_DB_CONFIG = {
    'mongo_url' : '',
    'collection_name' : '',
    'history' : '_history',
    'deletion_flag_field' : '_deleted',
    'id_field' : '_id',
    'modification_time_field' : '_modified_at',
    'modification_by_field' : '_modified_by',
    'process_deleted' : false,
    'show_history' : false,
    'user_id' : null,
    'persistence_connection' : false,
}
var db = null
var lastMongoUrl = null
var lastCollectionName = null
var cachedCollection = null

function preprocessDbConfig(dbConfig){
    return chimera.patchObject(DEFAULT_DB_CONFIG, dbConfig)
}

function preprocessFilter(dbConfig, filter){
    let filterCopy = chimera.deepCopyObject(filter)
    let multi = true
    dbConfig = preprocessDbConfig(dbConfig)
    if(filterCopy === null || typeof filterCopy == 'undefined'){
        filterCopy = {}
    }
    // if filterCopy is string, assume it as primary key value and build appropriate filterCopy
    if(typeof(filterCopy) == 'string'){
        let newfilterCopy = {}
        newfilterCopy[dbConfig.id_field] = filterCopy
        filterCopy = newfilterCopy
    }
    // determine multi
    if(Object.keys(filterCopy).length == 1 && dbConfig.id_field in filterCopy){
        multi = false
    }
    if(!dbConfig.process_deleted){
        if(dbConfig.deletion_flag_field != ''){
            // create "exists" filter
            let existFilter = {}
            existFilter[dbConfig.deletion_flag_field] = 0
            // modify filterCopy
            if(Object.keys(filterCopy).length != 0){
                filterCopy = {'$and' : [existFilter, filterCopy]}
            }
            else{
                filterCopy = existFilter
            }
        }
    }
    return [filterCopy, multi]
}

function preprocessProjection(dbConfig, projection){
    if(typeof(projection) == 'string'){
        return projection
    }
    let projectionCopy = chimera.deepCopyObject(projection)
    dbConfig = preprocessDbConfig(dbConfig)
    if(projectionCopy === null || typeof projectionCopy == 'undefined'){
        projectionCopy = {}
    }
    // if not process_deleted, don't show deletion_flag_field
    if(Object.keys(projectionCopy).length == 0 || !('fields' in projectionCopy)){
        projectionCopy['fields'] = {}
    }
    // determine whether additionalFilter needed or not
    let isAdditionalFilterNeeded = true
    for(key in projectionCopy['fields']){
        if(projectionCopy['fields'][key] == 1){
            isAdditionalFilterNeeded = false
            break
        }
    }
    // add additional filter if necessary
    if(isAdditionalFilterNeeded){
        if(dbConfig.deletion_flag_field != ''  && !dbConfig.process_deleted){
            projectionCopy['fields'][dbConfig.deletion_flag_field] = 0
        }
        if(dbConfig.history != '' && !dbConfig.show_history){
            projectionCopy['fields'][dbConfig.history] = 0
        }
    }
    return projectionCopy
}

function preprocessUpdateData(dbConfig, data){
    let updateData = chimera.deepCopyObject(data)
    // determine whether the data contains update operator or not
    let isContainOperator = false
    for(let key in data){
        if(key[0] == '$'){
            isContainOperator = true
            break
        }
    }
    // if no update operator detected, then put it at $set
    if(!isContainOperator){
        let newData = {}
        newData['$set'] = data
        updateData = newData
    }
    // copy the data for historical purpose
    let dataCopy = chimera.deepCopyObject(updateData)
    // remove $set, $push, and other update operators
    let newDataCopy = {}
    for(let key in dataCopy){
        if(key[0] == '$'){
            newDataCopy[key.substring(1)] = dataCopy[key]
        }
        else{
            newDataCopy[key] = dataCopy[key]
        }
    }
    dataCopy = newDataCopy
    // set modifier and modification time
    dataCopy[dbConfig.modification_by_field] = dbConfig.user_id
    dataCopy[dbConfig.modification_time_field] = Date.now()
    // add dataCopy as history
    if(!('$push' in updateData)){
        updateData['$push'] = {}
    }
    updateData['$push'][dbConfig.history] = dataCopy
    return updateData
}

function preprocessSingleInsertData(dbConfig, data){
    // copy the data for historical purpose
    let insertData = chimera.deepCopyObject(data)
    let dataCopy = chimera.deepCopyObject(data)
    let historyData = {'set' : dataCopy}
    historyData[dbConfig.modification_by_field] = dbConfig.user_id
    historyData[dbConfig.modification_time_field] = Date.now()
    insertData[dbConfig.history] = [historyData]
    insertData[dbConfig.deletion_flag_field] = 0
    return insertData
}

function preprocessInsertData(dbConfig, data){
    dbConfig = preprocessDbConfig(dbConfig)
    if(Array.isArray(data)){
        let newData = []
        for(let i=0; i<data.length; i++){
            let doc = data[i]
            newData.push(preprocessSingleInsertData(dbConfig, doc))
        }
        return newData
    }
    return preprocessSingleInsertData(dbConfig, data)
}

function preprocessCallback(callback){
    if(typeof(callback) != 'function'){
        callback = function(docs, success, error){
            if(!success){
                console.error(error)
            }
            console.log(JSON.stringify({'docs' : docs, 'success' : success, 'errorMessage' : error}))
        }
    }
    return callback
}

function initCollection(dbConfig){
    let startTime = process.hrtime()
    if(db == null || lastMongoUrl == null){
        db = monk(dbConfig.mongo_url)
        lastMongoUrl = dbConfig.mongo_url
        let elapsedTime = process.hrtime(startTime)
        console.warn('[INFO] Connection openned in: ' + chimera.getFormattedNanoSecond(elapsedTime) + ' NS');
    }
    if(lastCollectionName != dbConfig.collection_name || cachedCollection == null){
        startTime = process.hrtime()
        lastCollectionName = dbConfig.collection_name
        cachedCollection = db.get(lastCollectionName)
        let elapsedTime = process.hrtime(startTime)
        console.warn('[INFO] Collection initialized in: ' + chimera.getFormattedNanoSecond(elapsedTime) + ' NS');
    }
    return cachedCollection
}

function find(dbConfig, findFilter, projection, callback){
    if(typeof(findFilter) == 'function'){
        callback = findFilter
        findFilter = {}
        projection = {}
    }
    else if(typeof(projection) == 'function'){
        callback = projection
        projection = {}
    }
    let startTime = process.hrtime()
    dbConfig = preprocessDbConfig(dbConfig)
    let collection = initCollection(dbConfig)
    let [filter, multi] = preprocessFilter(dbConfig, findFilter)
    projection = preprocessProjection(dbConfig, projection)
    callback = preprocessCallback(callback)
    return collection.find(filter, projection, function(err, docs){
        let elapsedTime = process.hrtime(startTime)
        console.warn('[INFO] Execute "find" in:' + chimera.getFormattedNanoSecond(elapsedTime) + ' NS');
        // close the database connection
        if(!dbConfig.persistence_connection){closeConnection();}
        // ensure that _ids are purely string
        if(Array.isArray(docs)){
            for(let i=0; i<docs.length; i++){
                docs[i][dbConfig.id_field] = String(docs[i][dbConfig.id_field])
            }
        }
        // use doc instead of docs if it is not multi
        if(!multi){
            if(Array.isArray(docs) && docs.length>0){
                docs = docs[0]
            }
            else{
                docs = null
            }
        }
        // deal with callback
        if(err){
            console.error('[ERROR] ' + err)
            callback(null, false, err)
        }
        else{
            callback(docs, true, err)
        }
    })
}

function buildFilterForDocs(dbConfig, docs){
    let findFilter = {}
    if(Array.isArray(docs)){
        findFilter = {'$or': []}
        for(let i=0; i<docs.length; i++){
            let doc = docs[i]
            let subfindFilter = {}
            subfindFilter[dbConfig.id_field] = doc[dbConfig.id_field]
            findFilter['$or'].push(subfindFilter)
        }
    }
    else if(typeof(docs) != null){
        findFilter[dbConfig.id_field] = docs[dbConfig.id_field]
    }
    else{
        // hopefully no one make such a field
        findFilter['_not_exists_' + Math.round(Math.random()*10000000000)] = false
    }
    return findFilter
}

function insert(dbConfig, data, options, callback){
    if(typeof(options) == 'function'){
        callback = options
        options = {}
    }
    let startTime = process.hrtime()
    dbConfig = preprocessDbConfig(dbConfig)
    let collection = initCollection(dbConfig)
    data = preprocessInsertData(dbConfig, data)
    callback = preprocessCallback(callback)
    return collection.insert(data, options, function(error, docs){
        let elapsedTime = process.hrtime(startTime)
        console.warn('[INFO] Execute "insert" in: ' + chimera.getFormattedNanoSecond(elapsedTime) + ' NS')
        // not error
        if(!error){
            // build the findFilter
            let findFilter = buildFilterForDocs(dbConfig, docs)
            // call find
            find(dbConfig, findFilter, callback)
        }
        else{
            // close the database connection
            if(!dbConfig.persistence_connection){closeConnection();}
            // execute callback
            console.error('[ERROR] ' + error)
            callback(null, false, error)
        }
    })
}

function update(dbConfig, updateFilter, data, options, callback){
    if(typeof(options) == 'function'){
        callback = options
        options = {}
    }
    // preprocess options
    if(typeof(options) == 'undefined'){
        options = {}
    }
    options.multi = true
    let startTime = process.hrtime()
    dbConfig = preprocessDbConfig(dbConfig)
    data = preprocessUpdateData(dbConfig, data)
    let [filter, multi] = preprocessFilter(dbConfig, updateFilter)
    callback = preprocessCallback(callback)
    dbConfig.persistence_connection = true
    return find(dbConfig, updateFilter, function(docs, success, errorMessage){
        if(success){
            // build the findFilter
            let findFilter = buildFilterForDocs(dbConfig, docs)
            let collection = initCollection(dbConfig)
            collection.update(filter, data, options, function(error, result){
                let elapsedTime = process.hrtime(startTime)
                console.warn('[INFO] Execute "update" in: ' + chimera.getFormattedNanoSecond(elapsedTime) + ' NS')
                if(!error){
                    dbConfig.persistence_connection = false
                    find(dbConfig, findFilter, callback)
                }
                else{
                    // close the database connection
                    if(!dbConfig.persistence_connection){closeConnection();}
                    // execute callback
                    console.error('[ERROR] ' + error)
                    callback(null, false, error)
                }
            })
        }
        else{
            // close the database connection
            if(!dbConfig.persistence_connection){closeConnection();}
            // execute callback
            console.error('[ERROR] ' + errorMessage)
            callback(null, false, errorMessage)
        }
    })
}

function remove(dbConfig, filter, options, callback){
    dbConfig = preprocessDbConfig(dbConfig)
    dbConfig.process_deleted = true
    let data = {}
    data[dbConfig.deletion_flag_field] = 1
    return update(dbConfig, filter, data, options, callback)
}

function permanentRemove(dbConfig, removeFilter, options, callback){
    if(typeof(removeFilter) == 'function'){
        callback = removeFilter
        removeFilter = {}
        options = {}
    }
    else if(typeof(options) == 'function'){
        callback = options
        options = {}
    }
    let startTime = process.hrtime()
    dbConfig = preprocessDbConfig(dbConfig)
    dbConfig.process_deleted = true
    let collection = initCollection(dbConfig)
    let [filter, multi] = preprocessFilter(dbConfig, removeFilter)
    if(typeof(callback) != 'function'){
        callback = function(result, success, errorMessage){
            console.log(JSON.stringify({'result' : result, 'success' : success, 'errorMessage' : errorMessage}))
        }
    }
    return collection.remove(filter, options, function(err, result){
        let elapsedTime = process.hrtime(startTime)
        console.warn('[INFO] Execute "permanentRemove" in: ' + chimera.getFormattedNanoSecond(elapsedTime) + ' NS')
        // close the database connection
        if(!dbConfig.persistence_connection){closeConnection();}
        // we just want the "ok" and "n" key, not the full buffer, and JSON.parse(JSON.stringify()) solve the problem
        result = JSON.parse(JSON.stringify(result))
        // deal with callback
        if(err){
            console.error('[ERROR] ' + err)
            callback(null, false, err)
        }
        else{
            callback(result, true, '')
        }
    })
}

function createDbConfig(mongoUrl, collectionName, userId, callback){
    let url = 'mongodb://localhost/test'
    if(typeof(mongoUrl) == 'string'){
        url = mongoUrl
    }
    else if(typeof(mongoUrl) == 'object' && 'mongo_url' in mongoUrl){
        url = mongoUrl.mongo_url
    }
    let dbConfig = {'mongo_url':url, 'collection_name':collectionName, 'user_id':userId}
    callback(JSON.stringify(dbConfig), true, '')
}

function closeConnection(){
    if(db != null){
        db.close()
        db = null
        lastMongoUrl = null
        lastCollectionName = null
        cachedCollection = null
        console.warn('[INFO] Connection closed')
    }
}

function showUsage(){
    console.error('Missing or invalid parameters')
    console.error('Usage:')
    console.error(' * node '+process.argv[1]+' find <config> [<filter> [<projection>]]')
    console.error(' * node '+process.argv[1]+' insert <config> <dataInJSON>')
    console.error(' * node '+process.argv[1]+' update <config> <pkValue> <dataInJSON>')
    console.error(' * node '+process.argv[1]+' update <config> <filter> <dataInJSON>')
    console.error(' * node '+process.argv[1]+' remove <config> <pkValue>')
    console.error(' * node '+process.argv[1]+' remove <config> <filter>')
}

function isParameterValid(){
    if(process.argv.length >= 4){
        let action = process.argv[2]
        let validAction = ['find', 'insert', 'update', 'remove']
        let actionIndex = validAction.indexOf(action)
        if(actionIndex > -1){
            if(action == 'find'){
                return true
            }
            else if(action == 'insert'){
                return process.argv.length >= 5
            }
            else if(action == 'update'){
                return process.argv.length >= 6
            }
            else if(action == 'remove'){
                return process.argv.length >= 5
            }
        }
    }
    return false
}

module.exports ={
    'find' : find,
    'insert' : insert,
    'update' : update,
    'remove' : remove,
    'permanentRemove' : permanentRemove,
    'createDbConfig' : createDbConfig,
    'closeConnection' : closeConnection
}

if(require.main === module){
    if(!isParameterValid()){
        showUsage()
        console.log(JSON.stringify({'success': false, 'error_message': 'Missing or invalid parameters'}))
    }
    else{
        try{
            let action = process.argv[2]
            let dbConfig = preprocessDbConfig(JSON.parse(process.argv[3]))
            if(action == 'find'){
                let filter = process.argv.length > 4? process.argv[4] : {}
                let projection = process.argv.length > 5? JSON.parse(process.argv[5]) : {}
                find(dbConfig, filter, projection)
            }
            else if(action == 'insert'){
                let data = process.argv.length > 4? JSON.parse(process.argv[4]) : {}
                let options = process.argv.length > 5? JSON.parse(process.argv[5]) : {}
                insert(dbConfig, data, options)
            }
            else if(action == 'update'){
                let filter = process.argv.length > 4? process.argv[4] : {}
                let data = process.argv.length > 5? JSON.parse(process.argv[5]) : {}
                let options = process.argv.length > 6? JSON.parse(process.argv[6]) : {}
                update(dbConfig, filter, data, options)
            }
            else if(action == 'remove'){
                let filter = process.argv.length > 4? process.argv[4] : {}
                let options = process.argv.length > 5? JSON.parse(process.argv[5]) : {}
                remove(dbConfig, filter, options)
            }
        }catch(err){
            console.error(err)
            console.log(JSON.stringify({'success': false, 'error_message': 'Operation failure, invalid parameters'}))
            if(db != null){
                db.close()
            }
        }
    }
}
