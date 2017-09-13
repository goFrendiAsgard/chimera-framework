#! /usr/bin/env node
'use strict';

const db = require('chimera-framework/mongo-driver')
const structureCollectionName = 'cck.structure'

function createStructure(webConfig, schema, userId, callback){
    let query = {'table':schema.structure.table}
    let structureConfig = db.createDbConfig(webConfig, structureCollectionName, userId)
    let tableConfig = db.createDbConfig(webConfig, schema.structure.table, userId)
    // altered callback
    let alteredCallback = function(structure, success, errorMessage){
        if(success){
            if(Array.isArray(schema.data) && schema.data.length > 0){
                db.insert(tableConfig, schema.data, function(data, success, errorMessage){
                    if(success){
                        callback({'structure':structure, 'data':data}, true, '')
                    }
                    else{
                        callback({'structure':structure, 'data':[]}, false, errorMessage)
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
            db.insert(structureConfig, schema.structure, alteredCallback)
        }
        else{
            let structure = structures[0]
            // the structure exists
            db.update(structureConfig, structure._id, schema.structure, alteredCallback)
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
