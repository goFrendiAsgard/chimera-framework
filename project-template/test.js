#! /usr/bin/env node
'use strict';

const async = require('async')
const chimera = require('chimera-framework/core')
const testExecuteChain = chimera.test.testExecuteChain
const assert = require('assert')

async.series([
    // test migration
    (callback) => {testExecuteChain('Test migration',
        'tests/test-migration.yaml', [], {}, (output)=>{
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
],
(result, error)=>{
    console.log('test complete')
})
