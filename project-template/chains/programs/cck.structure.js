#! /usr/bin/env node
'use strict';

const db = require('chimera-framework/mongo-driver')
const structureCollectionName = 'cck.structure'

function createStructure(webConfig, schema, userId, callback){
    let query = {'table':schema.structure.table}
    let structureConfig = db.createDbConfig(webConfig, structureCollectionName, userId)
    let tableConfig = db.createDbConfig(webConfig, schema.structure.table, userId)
    // dataProcessingCallback
    let dataProcessingCallback = function(structure, success, errorMessage){
        if(success){
            if(Array.isArray(schema.data) && schema.data.length > 0){
                // prepare final callback
                let counter = 0
                let processedData = []
                let processSuccess = true
                let processErorrMessage = ''
                let wrappedCallback = function(doc, success, errorMessage){
                    // adjust counter, processedData, processSuccess, and processErrorMessage' value
                    if(counter < schema.data.length){
                        counter ++
                        processedData.push(doc)
                        if(!success){
                            processSuccess = false
                        }
                        processErorrMessage += errorMessage + '\n'
                    }
                    // run the real callback once all data processed
                    if(counter == schema.data.length){
                        callback({'structure':structure, 'data':processedData, processSuccess, processErorrMessage})
                    }
                }
                // loop for each row in data
                schema.data.forEach(function(row){
                    if(!('_id' in row)){
                        // if row has no _id, worry not. Just insert
                        db.insert(tableConfig, row, wrappedCallback)
                    }
                    else{
                        // if row has _id, look whether there is a document in collection with the same _id or not
                        db.find(tableConfig, row._id, function(doc, success, message){
                            if(success && doc!=null && '_id' in doc){
                                // the document has already exists, update
                                db.update(tableConfig, row._id, row, wrappedCallback)
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
            db.update(structureConfig, structure._id, schema.structure, dataProcessingCallback)
        }
    })
}

function getStructure(webConfig, table, callback){
    let stuctureConfig = db.createDbConfig(webConfig, structureCollectionName, userId)
    let query = {'table':schema.structure.table}
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
