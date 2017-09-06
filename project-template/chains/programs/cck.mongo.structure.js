#! /usr/bin/env node
'use strict';

const core = require('cck-mongo-core.js')

function insertData(tableConfig, data){
    core.insert(tableConfig, data, function(doc, error, errorMessage){
        // not sure -_-
    })
}

module.exports = function(webConfig, schema, userId){
    let stuctureConfig = core.createCckConfig(webConfig, 'cck.structure', userId)
    let tableConfig = core.createCckConfig(webConfig, schema.structure.table, userId)
    let query = {'table':schema.structure.table}

    core.find(structureConfig, query, function(structures, success, errorMessage){
        let structure = structures[0]
        if('_id' in structure){
            // the structure exists
            core.update(structureConfig, structure._id, schema.structure, function(updateResult, success, errorMessage){
                structure = updateResult[0]
                insertData(tableConfig, schema.data)
            })
        }
        else{
            // the structure doesn't exist
            core.insert(structureConfig, schema.structure, function(insertResult, success, error){
                structure = insertResult
                insertData(tableConfig, schema.data)
            })
        }
    })

}
