#! /usr/bin/env node
'use strict';

const process = require('process')
const mongodb = require('mongodb')
const monk = require('monk')
const chimera = require('chimera')

const DEFAULT_CONFIGS = {
    'mongo_url' : '',
    'table' : '',
    'history_table' : '',
    'deletion_flag_field' : '',
    'pk_field' : 'id',
    'valid_fields' : [],
    'modification_field' : '_modified_at',
    'modifier_field' : '_modifier'
}

if(process.argv.length < 4){
    showUsage()
}
else{
    // get action and configuration
    let action = process.argv[2]
    let config = config.patchObject(JSON.parse(process.argv[3]), DEFAULT_CONFIGS)

    let mongoUrl = config.mongo_url
    let tableName = config.table
    let historyTableName = config.history_table
    let deletionFlagField = config.deletion_flag_field
    let pkField = config.pk_Field
    let validFields = config.valid_fields
    let modification_field = config.modification_field
    let modifier_field = config.modifier_field

    let db =  monk(mongoUrl);

    if(action == 'get'){
        let criteria = process.length > 4? process.argv[4]: {}
        db.find(criteria)
    }
    else if(action == 'getOne'){
    }
    else if(action == 'insert'){
    }
    else if(action == 'update'){
    }
    else if(action == 'delete'){
    }
    else{
        showUsage()
    }

}

function showUsage(){
    console.error('[ERROR] Missing Arguments')
    console.error('Usage:')
    console.error(' * node '+process.argv[1]+' get [config] [criteria]')
    console.error(' * node '+process.argv[1]+' getOne [config] [pkValue]')
    console.error(' * node '+process.argv[1]+' insert [config] [dataInJSON] [userId]')
    console.error(' * node '+process.argv[1]+' update [config] [pkValue] [dateInJSON] [userId]')
    console.error(' * node '+process.argv[1]+' delete [config] [pkValue] [userId]')
}

function saveHistory(db, historyTable, data, modificationField, modifierField, userId, callback){
    let collection = db.get(historyTable)
    if(modifierField != ''){
        data[modifierField] = userId
    }
    if(modificationField != ''){
        data[modificatioNField] = Date.now()
    }
    collection.insert([data]).then((docs)=>{
        callback(docs)
    })

}
