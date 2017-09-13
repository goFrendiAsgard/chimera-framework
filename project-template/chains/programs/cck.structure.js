#! /usr/bin/env node
'use strict';

const db = require('chimera-framework/mongo-driver')
const async = require('async')
const structureCollectionName = 'cck.structure'

function createStructure(webConfig, schema, userId, callback){
    let query = {'table':schema.structure.table}
    let structureConfig = db.createDbConfig(webConfig, structureCollectionName, userId)
    let tableConfig = db.createDbConfig(webConfig, schema.structure.table, userId)
    // dataProcessingCallback
    let dataProcessingCallback = function(structure, success, errorMessage){
        if(success){
            if(Array.isArray(schema.data) && schema.data.length > 0){
                // afterDataProcessingCallback
                let processedData = []
                let processSuccess = true
                let processErrorMessage = ''
                let lastCallback = function(err, result){
                    callback({'structure':structure, 'data':processedData}, processSuccess, processErrorMessage)
                }
                // determine actions based on schema.data
                let actions = []
                for(let i=0; i<schema.data.length; i++){
                    let data = schema.data[i]
                    // define updateCallback
                    let updateCallback = function(localCallback){
                        db.update(tableConfig, data._id, data, function(doc, success, errorMessage){
                            console.error([doc, success, errorMessage])
                            if(success){
                                processedData.push(doc)
                            }
                            else{
                                console.error(errorMessage)
                                processSuccess = false
                            }
                            localCallback()
                        })
                    }
                    // define insertCallback
                    let insertCallback = function(localCallback){
                        db.insert(tableConfig, data, function(doc, success, errorMessage){
                            console.error([doc, success, errorMessage])
                            if(success){
                                processedData.push(doc)
                            }
                            else{
                                console.error(errorMessage)
                                processSuccess = false
                            }
                            localCallback()
                        })
                    }
                    // determine which callback to be added to actions
                    if('_id' in data){
                        db.find(tableConfig, data._id, function(doc, success, errorMessage){
                            if(doc != null && '_id' in doc){
                                actions.push(updateCallback)
                            }
                            else{
                                actions.push(insertCallback)
                            }
                        })
                    }
                    else{
                        actions.push(updateCallback)
                    }
                    console.error(actions)
                }
                console.error(actions)
                // run the actions, and then run the lastCallback
                async.parallel(actions, lastCallback)
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
