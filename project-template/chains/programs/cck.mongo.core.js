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

function initCollection(mongoUrl, collectionName){
    let db = monk(mongoUrl)
    return db.get(collectionName)
}

function find(cckConfig, collectionName, query, projection, callback){
    cckConfig = preprocessCckConfig(cckConfig)
    let collection = initCollection(cckConfig.mongoUrl, collectionName)
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

function findOne(cckConfig, collectionName, query, projection, callback){
    cckConfig = preprocessCckConfig(cckConfig)
    let collection = initCollection(cckConfig.mongoUrl, collectionName)
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

function insert(cckConfig, collectionName, data, options, callback){
    cckConfig = preprocessCckConfig(cckConfig)
    let collection = initCollection(cckConfig.mongoUrl, collectionName)
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

function update(cckConfig, collectionName, query, data, options, callback){
    cckConfig = preprocessCckConfig(cckConfig)
    let collection = initCollection(cckConfig.mongoUrl, collectionName)
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

function remove(cckConfig, collectionName, query, options, callback){
    cckConfig = preprocessCckConfig(cckConfig)
    let data = {}
    data[cckConfig.deletion_flag] = 1
    return update(cckConfig, collectionName, query, data, options, callback)
}

export({
    'find' : find,
    'insert' : insert,
    'update' : update,
    'remove' : remove
})

