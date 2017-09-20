#! /usr/bin/env node
'use strict';

const chimera = require('chimera-framework/core')
const db = require('chimera-framework/mongo-driver')
const structureCollectionName = 'cck.structure'

function preprocessSchema(schema){
    let newSchema = {}
    if(typeof(schema) == 'string' || schema instanceof String){
        newSchema['structure_filter'] = {'table' : schema}
    }
    else{
        // completing data_filter_field
        if(('data_filter_field' in schema)){
            newSchema['data_filter_field'] = schema.data_filter_field
        }
        else{
            newSchema['data_filter_field'] = '_id'
        }
        // completing structure_filter
        if(('structure_filter' in schema)){
            newSchema['structure_filter'] = chimera.deepCopyObject(schema.structure_filter)
        }
        else{
            if(('structure' in schema) && ('table' in schema.structure)){
                newSchema['structure_filter'] = {'table': schema.structure.table}
            }
            else{
                newSchema['structure_filter'] = {}
            }
        }
        // completing structure
        if('structure' in schema){
            newSchema['structure'] = chimera.deepCopyObject(schema.structure)
        }
        else{
            newSchema['structure'] = {}
        }
        // completing data
        if('data' in schema){
            newSchema['data'] = chimera.deepCopyObject(schema.data)
        }
        else{
            newSchema['data'] = []
        }
    }
    return newSchema
}

function createStructure(webConfig, schema, userId, callback){
    schema = preprocessSchema(schema)
    let query = schema.structure_filter 
    let structureConfig = db.createDbConfig(webConfig, structureCollectionName, userId)
    structureConfig.persistence_connection = true
    // dataProcessingCallback
    let dataProcessingCallback = function(structure, success, errorMessage){
        if(success){
            let tableConfig = db.createDbConfig(webConfig, structure.table, userId)
            tableConfig.persistence_connection = true
            if(Array.isArray(schema.data) && schema.data.length > 0){
                // prepare final callback
                let counter = 0
                let processedData = []
                let processSuccess = true
                let processErrorMessage = ''
                let wrappedCallback = function(doc, success, errorMessage){
                    // adjust counter, processedData, processSuccess, and processErrorMessage' value
                    if(counter < schema.data.length){
                        counter ++
                        processedData.push(doc)
                        if(!success){
                            processSuccess = false
                        }
                        if(errorMessage != ''){
                            processErrorMessage += errorMessage + '\n'
                        }
                    }
                    // run the real callback once all data processed
                    if(counter == schema.data.length){
                        db.closeConnection()
                        callback({'structure':structure, 'data':processedData, processSuccess, processErrorMessage})
                    }
                }
                // loop for each row in data
                schema.data.forEach(function(row){
                    // if row has _id, look whether there is a document in collection with the same _id or not
                    if('_id' in row){
                        row._id = db.preprocessId(row._id)
                    }
                    let rowQuery = {}
                    if(schema.data_filter_field in row){
                        rowQuery[schema.data_filter_field] = row[schema.data_filter_field]
                    }
                    if(Object.keys(rowQuery).length == 0){
                        // if no query, worry not, just insert
                        db.insert(tableConfig, row, wrappedCallback)
                    }
                    else{
                        db.find(tableConfig, rowQuery, function(docs, success, message){
                            if(success && docs!=null && docs.length > 0 && '_id' in docs[0]){
                                // the document has already exists, update
                                db.update(tableConfig, docs[0]._id, row, wrappedCallback)
                            }
                            else{
                                // the document doesn't exists yet, insert
                                db.insert(tableConfig, row, wrappedCallback)
                            }
                        })
                    }
                })
            }
            else{
                callback({'structure':structure, 'data':[]}, true, '')
            }
        }
        else{
            callback(null, false, errorMessage)
        }
    }
    // find and insert or update
    db.find(structureConfig, query, function(structures, success, errorMessage){
        if(!success){
            callback(null, false, errorMessage)
        }
        else if(structures.length == 0){
            // the structure doesn't exist
            db.insert(structureConfig, schema.structure, dataProcessingCallback)
        }
        else{
            let structure = structures[0]
            // the structure exists
            if(Object.keys(schema.structure).length > 0){
                db.update(structureConfig, structure._id, schema.structure, dataProcessingCallback)
            }
            else{
                dataProcessingCallback(structure, true, '')
            }
        }
    })
}

function getStructure(webConfig, schema, userId, callback){
    schema = preprocessSchema(schema)
    let structureConfig = db.createDbConfig(webConfig, structureCollectionName, userId)
    let query = schema.structure_filter 
    db.find(structureConfig, query, function(structures, success, errorMessage){
        if(!success){
            callback(null, false, errorMessage)
        }
        else if(structures.length == 0){
            console.error('Structure not found')
            callback(null, false, 'Structure not found')
        }
        else{
            callback(structures[0], true, '')
        }
    })
}

module.exports = {
    'create': createStructure,
    'get': getStructure,
}
