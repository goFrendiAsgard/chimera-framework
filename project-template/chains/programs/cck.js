#! /usr/bin/env node
'use strict';

const process = require('process')
const mongodb = require('mongodb')
const monk = require('monk')
const chimera = require('chimera-framework/core')

var DEFAULT_CONFIGS = {
    'mongo_url' : '',
    'table' : '',
    'history_table' : '',
    'deletion_flag_field' : '_deleted',
    'pk_field' : 'id',
    'modification_field' : '_modified_at',
    'modifier_field' : '_modifier',
    'pk_ref_field' : '_ref_id'
}

if(process.argv.length < 4){
    showUsage()
}
else{
    // get action and configuration
    let action = process.argv[2]
    let config = chimera.patchObject(DEFAULT_CONFIGS, JSON.parse(process.argv[3]))

    let mongoUrl = config.mongo_url
    let tableName = config.table
    let historyTableName = config.history_table
    let deletionFlagField = config.deletion_flag_field
    let pkField = config.pk_field
    let validFields = config.valid_fields
    let modificationField = config.modification_field
    let modifierField = config.modifier_field
    let pkRefField = config.pk_ref_field

    let db =  monk(mongoUrl)

    if(action == 'get'){
        let criteria = process.length > 4? process.argv[4]: {}
        criteria = preprocessCriteria(deletionFlagField, criteria)
        db.get(tableName).find(criteria).then(
            (rows) =>{
                console.log(JSON.stringify(rows))
                db.close()
            },
            () => {db.close()}
        )
    }
    else if(action == 'getOne'){
        if(process.argv.length < 5){
            showUsage()
            db.close()
        }
        else{
            let pkValue = process.argv[4]
            let criteria = {}
            criteria[pkField] = pkValue
            criteria = preprocessCriteria(deletionFlagField, criteria)
            db.get(tableName).findOne(criteria)
                .then(
                    (row) =>{
                        console.log(JSON.stringify(row))
                        db.close()
                    },
                    () => {db.close()}
                )
        }
    }
    else if(action == 'insert'){
        if(process.argv.length < 6){
            showUsage()
            db.close()
        }
        else{
            let data = JSON.parse(process.argv[4])
            let userId = process.argv[5]
            data[deletionFlagField] = 0
            db.get(tableName).insert(data, {})
            .then(
                (newRow) =>{
                    console.log(JSON.stringify(newRow))
                    createHistoryAndShowRow(db, historyTableName, newRow, pkRefField, modificationField, modifierField, userId)
                },
                () => {db.close()}
            )
        }
    }
    else if(action == 'update'){
        if(process.argv.length < 7){
            showUsage()
            db.close()
        }
        else{
            let pkValue = process.argv[4]
            let data = JSON.parse(process.argv[5])
            let userId = process.argv[6]
            let criteria = {}
            criteria[pkField] = pkValue
            db.get(tableName).findOne(criteria).then(
                (oldData) => {
                    data = chimera.patchObject(oldData, data)
                    db.get(tableName).findOneAndUpdate(criteria, data)
                        .then(
                            (newRow) =>{
                                console.log(JSON.stringify(newRow))
                                createHistoryAndShowRow(db, historyTableName, newRow, pkRefField, modificationField, modifierField, userId)
                            },
                            () => {db.close()}
                        )
                }
            )
        }
    }
    else if(action == 'delete'){
        if(process.argv.length < 6){
            showUsage()
            db.close()
        }
        else{
            let pkValue = process.argv[4]
            let userId = process.argv[5]
            let criteria = {}
            let data = {}
            criteria[pkField] = pkValue
            data[deletionFlagField] = 1

            db.get(tableName).findOne(criteria).then(
                (oldData) => {
                    data = chimera.patchObject(oldData, data)
                    db.get(tableName).findOneAndUpdate(criteria, data)
                        .then(
                            (newRow) =>{
                                console.log(JSON.stringify(newRow))
                                createHistoryAndShowRow(db, historyTableName, newRow, pkRefField, modificationField, modifierField, userId)
                            },
                            () => {db.close()}
                        )
                }
            )
        }
    }
    else{
        showUsage()
        db.close()
    }

}

function preprocessCriteria(deletionFlagField, criteria){
    if(deletionFlagField != ''){
        // create "exists" criteria
        let existCriteria = {}
        existCriteria[deletionFlagField] = 0
        // modify criteria
        if(Object.keys(criteria).length != 0){
            criteria = {'$and' : [existCriteria, criteria]}
        }
        else{
            criteria = existCriteria
        }
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

function createHistoryAndShowRow(db, historyTableName, newRow, pkRefField, modificationField, modifierField, userId){
    let data = chimera.deepCopyObject(newRow)
    delete data['_id']
    if(modifierField != ''){
        data[modifierField] = userId
    }
    if(modificationField != ''){
        data[modificationField] = Date.now()
    }
    if(pkRefField != ''){
        data[pkRefField] = newRow['_id']
    }
    db.get(historyTableName).insert(data, {})
    .then(
        (historyRow) => {
        }
    )
    .then(
        () => {db.close()}
    )
}
