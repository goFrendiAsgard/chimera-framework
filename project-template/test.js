#! /usr/bin/env node
'use strict';

const async = require('async')
const chimera = require('chimera-framework/core')
const testExecuteChain = chimera.test.testExecuteChain
const assert = require('assert')

const mockedWebConfig = {'mongo_url': 'mongodb://localhost/webTest'}

async.series([
    // test migration
    (callback) => {testExecuteChain('Test migration',
        'tests/test-migration.yaml', [mockedWebConfig], {}, (output)=>{
            // check the structures
            assert('_id' in output.structure.structure, 'output.structure.structure does\'nt have id')
            assert('_id' in output.user.structure, 'output.user.structure does\'nt have id')
            assert('_id' in output.group.structure, 'output.group.structure does\'nt have id')
            assert('_id' in output.config.structure, 'output.config.structure does\'nt have id')
            assert('_id' in output.route.structure, 'output.route.structure does\'nt have id')
            // check the data
            assert(output.structure.data.length == 0, 'output.structure.data\'s length should be 0')
            assert(output.user.data.length == 1, 'output.data.data\'s length should be 1')
            assert(output.group.data.length == 2, 'output.group.data\'s length should be 2')
            assert(output.config.data.length == 0, 'output.config.data\'s length should be 0')
            assert(output.route.data.length == 0, 'output.route.data\'s length should be 0')
        }, callback)
    },
    // test migration again
    (callback) => {testExecuteChain('Test migration Again',
        'tests/test-migration-again.yaml', [mockedWebConfig], {}, (output)=>{
            // check the structures
            assert('_id' in output.user.structure, 'output.user.structure does\'nt have id')
            assert('table' in output.user.structure, 'output.user.structure does\'nt have table')
            assert(output.user.structure.table == 'cms_user', 'output.user.structure.table should be cms_user')
            assert('_id' in output.group.structure, 'output.group.structure does\'nt have id')
            assert('table' in output.group.structure, 'output.group.structure does\'nt have table')
            assert(output.group.structure.table == 'cms_group', 'output.group.structure.table should be cms_group')
            // check the data
            assert(output.user.data.length == 1, 'output.data.data\'s length should be 1')
            assert(output.group.data.length == 1, 'output.group.data\'s length should be 1')
        }, callback)
    },
    // test migration again
    (callback) => {testExecuteChain('Test get structure',
        'tests/test-getStructure.yaml', [mockedWebConfig], {}, (output)=>{
            // check the structures
            assert('_id' in output, 'output does\'nt have id')
        }, callback)
    },
    // test get user and group 
    (callback) => {testExecuteChain('Test get user and group',
        'tests/test-getUserAndGroup.yaml', [mockedWebConfig], {}, (output)=>{
            // check the structures
            assert(output.user.length == 1, 'output.user.length == 1')
            assert(output.group.length == 3, 'output.group.length == 3')
        }, callback)
    },
],
(result, error)=>{
    console.log('test complete')
})
