#! /usr/bin/env node
'use strict';

const process = require('process')
const mongodb = require('mongodb')
const monk = require('monk')
const chimera = require('chimera-framework/core')

var DEFAULT_CONFIGS = {
    'mongo_url' : '',
    'table' : '',
    'history' : '',
    'deletion_flag' : '_deleted',
    'id' : '_id',
    'modification_time' : '_modified_at',
    'modification_by' : '_modified_by',
    'show_deleted' : false
}

function preprocessQuery(query, config){
    if(config.deletion_flag != '' && !config.show_deleted){
        // create "exists" query
        let existquery = {}
        existquery[config.deletion_flag] = 0
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

function getHistoryData(data, userId, config){
    let historyData = chimera.deepCopyObject(data) 
    historyData[config.modification_time] = Date.now()
    historyData[config.modification_by] = userId
    return historyData
}

function showUsage(){
    console.error('[ERROR] Missing Arguments')
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

if(!isParameterValid()){
    showUsage()
    console.log(JSON.stringify({'success': false, 'error_message': 'Missing Parameters'}))
}
else{
    // get action and configuration
    let action = process.argv[2]
    let config = chimera.patchObject(DEFAULT_CONFIGS, JSON.parse(process.argv[3]))

    let mongoUrl = config.mongo_url
    let table = config.table
    let history = config.history
    let deletionFlag = config.deletion_flag
    let id_field = config.id
    let mtime_field = config.modification_time
    let mby_field = config.modification_by

    let db =  monk(mongoUrl)
    let collection = db.get(table)
    let defaultProjection = {}
    defaultProjection[deletionFlag] = 0
    defaultProjection[history] = 0

    if(action == 'get'){
        let query = process.argv.length > 4? JSON.parse(process.argv[4]): {}
        let projection = process.argv.length > 5? JSON.parse(process.argv[5]): defaultProjection
        query = preprocessQuery(query, config)
        collection.find(query, projection, function(err, rows){
            if(err){
                console.error(err)
                console.log(JSON.stringify({'success': false, 'error_message': 'Operation failure: get'}))
                db.close()
            }
            else{
                console.log(JSON.stringify({'success': true, 'error_message' : '', 'rows': rows}))
                db.close()
            }
        })
    }
    else if(action == 'getOne'){
        let pkValue = process.argv[4]
        let query = {}
        let projection = process.length > 5? JSON.parese(process.argv[5]): defaultProjection
        query[id_field] = pkValue
        query = preprocessQuery(query, config)
        collection.findOne(query, projection, function(err, row){
            if(err){
                console.error(err)
                console.log(JSON.stringify({'success': false, 'error_message': 'Operation failure: getOne'}))
                db.close()
            }
            else{
                console.log(JSON.stringify({'success': true, 'error_message' : '', 'row': row}))
                db.close()
            }
        })
    }
    else if(action == 'insert'){
        let data = JSON.parse(process.argv[4])
        let userId = process.argv[5]
        data[deletionFlag] = 0
        data[history] = [getHistoryData(data, userId, config)]
        collection.insert(data, function(err, row){
            if(err){
                console.error(err)
                console.log(JSON.stringify({'success': false, 'error_message': 'Operation failure: insert'}))
                db.close()
            }
            else{
                console.log(JSON.stringify({'success': true, 'error_message' : '', 'row' : row}))
                db.close()
            }
        })
    }
    else if(action == 'update'){
        let pkValue = process.argv[4]
        let data = JSON.parse(process.argv[5])
        let userId = process.argv[6]
        let query = {}
        let historyData = {}
        query[id_field] = pkValue
        query = preprocessQuery(query, config)
        data[deletionFlag] = 0
        historyData[history] = getHistoryData(data, userId, config)
        collection.update(query, {'$set':data, '$push':historyData}, function(err, result){
            if(err){
                console.error(err)
                console.log(JSON.stringify({'success': false, 'error_message': 'Operation failure: Update'}))
                db.close()
            }
            else{
                console.log(JSON.stringify({'success': true, 'error_message' : ''}))
                db.close()
            }
        })
    }
    else if(action == 'delete'){
        let pkValue = process.argv[4]
        let data = {}
        let userId = process.argv[5]
        let query = {}
        let historyData = {}
        query[id_field] = pkValue
        query = preprocessQuery(query, config)
        data[deletionFlag] = 1
        historyData[history] = getHistoryData(data, userId, config)
        collection.update(query, {'$set':data, '$push':historyData}, function(err, result){
            if(err){
                console.error(err)
                console.log(JSON.stringify({'success': false, 'error_message': 'Operation failure: Delete'}))
                db.close()
            }
            else{
                console.log(JSON.stringify({'success': true, 'error_message' : ''}))
                db.close()
            }
        })
    }
}

