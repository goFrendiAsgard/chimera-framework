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
    let modificationField = config.modification_field
    let modifierField = config.modifier_field

    let db =  monk(mongoUrl);

    if(action == 'get'){
        let criteria = process.length > 4? process.argv[4]: {}
        criteria = preprocessCriteria(deletionFlagField, criteria)
        db.get(tableName).find(criteria).then((rows) =>{
            console.log(JSON.stringify(rows))
        })
    }
    else if(action == 'getOne'){
        let criteria = process.length > 4? process.argv[4]: {}
        criteria = preprocessCriteria(deletionFlagField, criteria)
        db.get(tableName).findOne(criteria).then((rows) =>{
            console.log(JSON.stringify(rows))
        })
    }
    else if(action == 'insert'){
        if(process.argv.length < 6){
            showUsage()
        }
        else{
            let data = JSON.parse(process.argv[4])
            let userId = process.argv[5]
            db.get(tableName).insert(data).then((row) =>{
                saveHistory(db, historyTableName, data, modificationField, modifierField, userId, ()=>{
                    console.log(JSON.stringify(row))
                })
            })
        }
    }
    else if(action == 'update'){
        if(process.argv.length < 7){
            showUsage()
        }
        else{
            let pkValue = process.argv[4]
            let data = JSON.parse(process.argv[5])
            let userId = process.argv[6]
            db.get(tableName).findOneAndUpdate({pkField:pkValue}, data).then((row) =>{
                saveHistory(db, historyTableName, data, modificationField, modifierField, userId, ()=>{
                    console.log(JSON.stringify(row))
                })
            })
        }
    }
    else if(action == 'delete'){
        if(process.argv.length < 6){
            showUsage()
        }
        else{
            let pkValue = process.argv[4]
            let userId = process.argv[5]
            db.get(tableName).findOneAndUpdate({pkField:pkValue}, {deletionFlagField:1}).then((row) =>{
                saveHistory(db, historyTableName, data, modificationField, modifierField, userId, ()=>{
                    console.log(JSON.stringify(row))
                })
            })
        }
    }
    else{
        showUsage()
    }

}

function preprocessCriteria(deletionFlagField, criteria){
    if(deletionFlagField != ''){
        criteria = {'$and' : [{deletionFlagField: 0}, criteria]}
    }
    return criteria
}

function showUsage(){
    console.error('[ERROR] Missing Arguments')
    console.error('Usage:')
    console.error(' * node '+process.argv[1]+' get [config] [criteria]')
    console.error(' * node '+process.argv[1]+' getOne [config] [pkValue]')
    console.error(' * node '+process.argv[1]+' insert [config] [dataInJSON] [userId]')
    console.error(' * node '+process.argv[1]+' update [config] [pkValue] [dataInJSON] [userId]')
    console.error(' * node '+process.argv[1]+' delete [config] [pkValue] [userId]')
}

function saveHistory(db, historyTableName, data, modificationField, modifierField, userId, callback){
    if(modifierField != ''){
        data[modifierField] = userId
    }
    if(modificationField != ''){
        data[modificationField] = Date.now()
    }
    db.get(historyTableName).insert([data]).then((row)=>{
        callback(row)
    })

}
