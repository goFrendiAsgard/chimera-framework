#! /usr/bin/env node
'use strict';

const process = require('process')
const mongodb = require('mongodb')
const monk = require('monk')
const chimera = require('chimera-framework/core')


var DEFAULT_CCK_CONFIG = {
    'mongo_url' : '',
    'table' : '',
    'history' : '_history',
    'deletion_flag' : '_deleted',
    'id' : '_id',
    'modification_time' : '_modified_at',
    'modification_by' : '_modified_by',
    'show_deleted' : false,
    'user_id' : null,
}
var db = null

function preprocessCckConfig(cckConfig){
    return chimera.patchObject(DEFAULT_CCK_CONFIG, cckConfig)
}

function preprocessQuery(cckConfig, query){
    cckConfig = preprocessCckConfig(cckConfig)
    if(query === null || typeof query == 'undefined'){
        query = {}
    }
    // if query is string, assume it as primary key value and build appropriate query
    if(typeof query == 'string'){
        try{
            query = JSON.parse(query)
        }
        catch(e){
            let newQuery = {}
            newQuery[cckConfig.id] = query
            query = newQuery
        }
    }
    if(cckConfig.deletion_flag != '' && !cckConfig.show_deleted){
        // create "exists" query
        let existquery = {}
        existquery[cckConfig.deletion_flag] = 0
        // modify query
        if(Object.keys(query).length != 0){
            query = {'$and' : [existquery, query]}
        }
        else{
            query = existquery
        }
    }
    return query
}

function preprocessProjection(cckConfig, projection){
    cckConfig = preprocessCckConfig(cckConfig)
    if(projection === null || typeof projection == 'undefined'){
        projection = {}
    }
    // if not show_deleted, don't show deletion_flag 
    if(Object.keys(projection).length == 0 && !cckConfig.show_deleted){
        if(cckConfig.deletion_flag != '' ){
            projection[cckConfig.deletion_flag] = 0
        }
        if(cckConfig.history != ''){
            projection[cckConfig.history] = 0
        }
    }
    return projection
}

function preprocessUpdateData(cckConfig, data){
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
        data = newData
    }
    // copy the data for historical purpose
    let dataCopy = chimera.deepCopyObject(data)
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
    dataCopy[cckConfig.modification_by] = cckConfig.user_id
    dataCopy[cckConfig.modification_time] = Date.now()
    // add dataCopy as history
    if(!('$push' in data)){
        data['$push'] = {}
    }
    data['$push'][cckConfig.history] = dataCopy
    return data
}

function preprocessSingleInsertData(cckConfig, data){
    // copy the data for historical purpose
    let dataCopy = chimera.deepCopyObject(data)
    let historyData = {'set' : dataCopy}
    historyData[cckConfig.modification_by] = cckConfig.user_id
    historyData[cckConfig.modification_time] = Date.now()
    data[cckConfig.history] = [historyData]
    return data
}

function preprocessInsertData(cckConfig, data){
    cckConfig = preprocessCckConfig(cckConfig)
    if(Array.isArray(data)){
        newData = []
        for(let i=0; i<data.length; i++){
            let doc = data[i]
            newData.push(preprocessSingleInsertData(cckConfig, data))
        }
        return newData
    }
    return preprocessSingleInsertData(cckConfig, data)
}

function initCollection(cckConfig){
    if(db === null){
        db = monk(cckConfig.mongo_url)
    }
    return db.get(cckConfig.table)
}

function find(cckConfig, query, projection, callback){
    cckConfig = preprocessCckConfig(cckConfig)
    let collection = initCollection(cckConfig)
    query = preprocessQuery(cckConfig, query)
    projection = preprocessProjection(cckConfig, projection)
    return collection.find(query, projection, function(err, docs){
        // close the database
        if(db != null){
            db.close()
            db = null
        }
        // deal with callback
        if(callback == null || typeof callback == 'undefined'){
            if(err){
                console.error(err)
                console.log(JSON.stringify({'success': false, 'error': err, 'docs': []}))
            }
            else{
                console.log(JSON.stringify({'success': true, 'error': err, 'docs': docs}))
            }
        }
        else{
            callback(err, docs)
        }
    })
}

function findOne(cckConfig, query, projection, callback){
    cckConfig = preprocessCckConfig(cckConfig)
    let collection = initCollection(cckConfig)
    query = preprocessQuery(cckConfig, query)
    projection = preprocessProjection(cckConfig, projection)
    return collection.findOne(query, projection, function(err, doc){
        // close the database
        if(db != null){
            db.close()
            db = null
        }
        // deal with callback
        if(callback == null || typeof callback == 'undefined'){
            if(err){
                console.error(err)
                console.log(JSON.stringify({'success': false, 'error':err, 'doc':{} }))
            }
            else{
                console.log(JSON.stringify({'success': true, 'error':err, 'doc':doc}))
            }
        }
        else{
            callback(err, doc)
        }
    })
}

function insert(cckConfig, data, options, callback){
    cckConfig = preprocessCckConfig(cckConfig)
    let collection = initCollection(cckConfig)
    data = preprocessInsertData(cckConfig, data)
    data[cckConfig.deletion_flag] = 0
    return collection.insert(data, options, function(err, doc){
        // close the database
        if(db != null){
            db.close()
            db = null
        }
        // deal with callback
        if(callback == null || typeof callback == 'undefined'){
            if(err){
                console.error(err)
                console.log(JSON.stringify({'success': false, 'error': err, 'doc': {} }))
            }
            else{
                console.log(JSON.stringify({'success': true, 'error': err, 'doc': doc}))
            }
        }
        else{
            callback(err, doc)
        }
    })
}

function update(cckConfig, query, data, options, callback){
    cckConfig = preprocessCckConfig(cckConfig)
    let collection = initCollection(cckConfig)
    data = preprocessUpdateData(cckConfig, data)
    query = preprocessQuery(cckConfig, query)
    return collection.update(query, data, options, function(err, result){
        // close the database
        if(db != null){
            db.close()
            db = null
        }
        // deal with callback
        if(callback == null || typeof callback == 'undefined'){
            if(err){
                console.error(err)
                console.log(JSON.stringify({'success': false, 'error': err, 'result': result, 'docs':{}}))
            }
            else{
                if(result.n > 0){
                    find(cckConfig, query, null, function(findErr, docs){
                        if(err){
                            console.error(err)
                            console.log(JSON.stringify({'success': true, 'error': findErr, 'result': result, 'docs': {}}))
                        }
                        else{
                            console.log(JSON.stringify({'success': true, 'error': err, 'result': result, 'docs': docs}))
                        }
                    })
                }
                else{
                    console.error(err)
                    console.log(JSON.stringify({'success': true, 'error': err, 'result': result, 'docs': {}}))
                }
            }
        }
        else{
            callback(err, result)
        }
    })
}

function remove(cckConfig, query, options, callback){
    cckConfig = preprocessCckConfig(cckConfig)
    cckConfig.show_deleted = true
    let data = {}
    data[cckConfig.deletion_flag] = 1
    return update(cckConfig, query, data, options, callback)
}

function showUsage(){
    console.error('Missing or invalid parameters')
    console.error('Usage:')
    console.error(' * node '+process.argv[1]+' get [config] [query] [projection]')
    console.error(' * node '+process.argv[1]+' getOne [config] [pkValue]')
    console.error(' * node '+process.argv[1]+' insert [config] [dataInJSON] [userId]')
    console.error(' * node '+process.argv[1]+' update [config] [pkValue] [dataInJSON] [userId]')
    console.error(' * node '+process.argv[1]+' delete [config] [pkValue] [userId]')
}

function isParameterValid(){
    if(process.argv.length >= 4){
        let action = process.argv[2]
        let validAction = ['get', 'getOne', 'insert', 'update', 'delete']
        let actionIndex = validAction.indexOf(action)
        if(actionIndex > -1){
            if(action == 'get'){
                return true
            }
            else if(action == 'getOne'){
                return process.argv.length >= 4
            }
            else if(action == 'insert'){
                return process.argv.length >= 5
            }
            else if(action == 'update'){
                return process.argv.length >= 6
            }
            else if(action == 'delete'){
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
    'remove' : remove
}

if(require.main === module){
    if(!isParameterValid()){
        showUsage()
        console.log(JSON.stringify({'success': false, 'error_message': 'Missing or invalid parameters'}))
    }
    else{
        try{
            let action = process.argv[2]
            let cckConfig = preprocessCckConfig(JSON.parse(process.argv[3]))
            if(action == 'get'){
                let query = process.argv.length > 4? process.argv[4] : {}
                let projection = process.argv.length > 5? JSON.parse(process.argv[5]) : {}
                find(cckConfig, query, projection)
            }
            else if(action == 'getOne'){
                let query = process.argv.length > 4? process.argv[4] : {}
                let projection = process.argv.length > 5? JSON.parse(process.argv[5]) : {}
                findOne(cckConfig, query, projection)
            }
            else if(action == 'insert'){
                let data = process.argv.length > 4? JSON.parse(process.argv[4]) : {}
                let options = process.argv.length > 5? JSON.parse(process.argv[5]) : {}
                insert(cckConfig, data, options)
            }
            else if(action == 'update'){
                let query = process.argv.length > 4? process.argv[4] : {}
                let data = process.argv.length > 5? JSON.parse(process.argv[5]) : {}
                let options = process.argv.length > 6? JSON.parse(process.argv[6]) : {}
                update(cckConfig, query, data, options)
            }
            else if(action == 'delete'){
                let query = process.argv.length > 4? process.argv[4] : {}
                let options = process.argv.length > 5? JSON.parse(process.argv[5]) : {}
                remove(cckConfig, query, options)
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
