#! /usr/bin/env node
'use strict';

const db = require('cck-mongo-db.js')

function insertData(tableConfig, data){
    db.insert(tableConfig, data, function(docs, error, errorMessage){
        console.error(docs)
        // not sure -_-
    })
}

module.exports = function(webConfig, schema, userId){
    let stuctureConfig = db.createCckConfig(webConfig, 'cck.structure', userId)
    let tableConfig = db.createCckConfig(webConfig, schema.structure.table, userId)
    let query = {'table':schema.structure.table}

    db.find(structureConfig, query, function(structures, success, errorMessage){
        let structure = structures[0]
        if('_id' in structure){
            // the structure exists
            db.update(structureConfig, structure._id, schema.structure, function(updateResult, success, errorMessage){
                structure = updateResult
                insertData(tableConfig, schema.data)
            })
        }
        else{
            // the structure doesn't exist
            db.insert(structureConfig, schema.structure, function(insertResult, success, error){
                structure = insertResult
                insertData(tableConfig, schema.data)
            })
        }
    })

}
