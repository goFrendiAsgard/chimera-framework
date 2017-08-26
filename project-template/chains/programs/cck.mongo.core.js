#! /usr/bin/env node
'use strict';

const process = require('process')
const mongodb = require('mongodb')
const monk = require('monk')
const chimera = require('chimera-framework/core')


var DEFAULT_CCK_CONFIG = {
    'mongo_url' : '',
    'table' : '',
    'history' : '',
    'deletion_flag' : '_deleted',
    'id' : '_id',
    'modification_time' : '_modified_at',
    'modification_by' : '_modified_by',
    'show_deleted' : false,
    'user_id' : null,
}

function preprocessCckConfig(cckConfig){
    return chimera.patchObject(DEFAULT_CCK_CONFIG, cckConfig)
}

function preprocessQuery(cckConfig, query){
    cckConfig = preprocessCckConfig(cckConfig)
    if(query === null){
        query = {}
    }
    // if query is string, assume it as primary key value and build appropriate query
    if(typeof query == 'string'){
        let pk = cckConfig.id
        let newQuery = {}
        newQuery[pk] = query
        query = newQuery
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

function preprocessSingleUpdateData(cckConfig, data){
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
    dataCopy[cckConfig.modification_by] = cckConfig.user_id
    dataCopy[cckConfig.modification_time] = Date.now()
    if(!('$push' in data)){
        data['$push'] = []
    }
    data['$push'][cckConfig.history] = dataCopy
    return data
}

function preprocessUpdateData(cckConfig, data){
    cckConfig = preprocessCckConfig(cckConfig)
    if(Array.isArray(data)){
        newData = []
        for(let i=0; i<data.length; i++){
            let doc = data[i]
            newData.push(preprocessSingleUpdateData(cckConfig, data))
        }
        return newData
    }
    return preprocessSingleUpdateData(cckConfig, data)
}

function preprocessSingleInsertData(cckConfig, data){
    // copy the data for historical purpose
    let dataCopy = chimera.deepCopyObject(data)
    dataCopy[cckConfig.modification_by] = cckConfig.user_id
    dataCopy[cckConfig.modification_time] = Date.now()
    data[cckConfig.history] = [dataCopy]
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
    let db = monk(cckConfig.mongo_url)
    return db.get(cckConfig.table)
}

function find(cckConfig, query, projection, callback){
    cckConfig = preprocessCckConfig(cckConfig)
    let collection = initCollection(cckConfig)
    query = preprocessQuery(query)
    return collection.find(query, projection, function(err, docs){
        if(callback == null){
            if(err){
                console.error(JSON.stringify({'error':err, 'docs':[]}))
            }
            else{
                console.log({'error':err, 'docs':doc})
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
    query = preprocessQuery(query)
    return collection.findOne(query, projection, function(err, doc){
        if(callback == null){
            if(err){
                console.error(JSON.stringify({'error':err, 'doc':[]}))
            }
            else{
                console.log({'error':err, 'doc':doc})
            }
        }
        else{
            callback(err, docs)
        }
    })
}

function insert(cckConfig, data, options, callback){
    cckConfig = preprocessCckConfig(cckConfig)
    let collection = initCollection(cckConfig)
    data = preprocessInsertData(cckConfig, data)
    return collection.insert(data, options, function(err, doc){
        if(callback == null){
            if(err){
                console.error(JSON.stringify({'error':err, 'doc':[]}))
            }
            else{
                console.log({'error':err, 'doc':doc})
            }
        }
        else{
            callback(err, docs)
        }
    })
}

function update(cckConfig, query, data, options, callback){
    cckConfig = preprocessCckConfig(cckConfig)
    let collection = initCollection(cckConfig)
    data = preprocessUpdateData(cckConfig, data)
    query = preprocessQuery(query)
    return collection.update(data, options, function(err, doc){
        if(callback == null){
            if(err){
                console.error(JSON.stringify({'error':err, 'doc':[]}))
            }
            else{
                console.log({'error':err, 'doc':doc})
            }
        }
        else{
            callback(err, docs)
        }
    })
}

function remove(cckConfig, query, options, callback){
    cckConfig = preprocessCckConfig(cckConfig)
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
                return process.argv.length >= 5
            }
            else if(action == 'insert'){
                return process.argv.length >= 6
            }
            else if(action == 'update'){
                return process.argv.length >= 7
            }
            else if(action == 'delete'){
                return process.argv.length >= 6
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
        let action = process.argv[2]
        let cckConfig = preprocessCckConfig(JSON.parse(process.argv[3]))
        if(action == 'get'){
            let query = process.argv.length > 4? process.argv[4] : {}
            let projection = process.argv.length > 5? process.argv[5] : {}
            find(cckConfig, query, projection)
        }
        else if(action == 'getOne'){
            let query = process.argv.length > 4? process.argv[4] : {}
            let projection = process.argv.length > 5? process.argv[5] : {}
            findOne(cckConfig, query, projection)
        }
        else if(action == 'insert'){
            let data = process.argv.length > 4? process.argv[4] : {}
            let options = process.argv.length > 5? process.argv[5] : {}
            insert(cckConfig, query, projection)
        }
        else if(action == 'update'){
            let query = process.argv.length > 4? process.argv[4] : {}
            let data = process.argv.length > 5? process.argv[5] : {}
            let options = process.argv.length > 6? process.argv[6] : {}
            update(cckConfig, query, data, options)
        }
        else if(action == 'delete'){
            let query = process.argv.length > 4? process.argv[4] : {}
            let options = process.argv.length > 5? process.argv[5] : {}
            remove(cckConfig, query, options)
        }
    }
}
