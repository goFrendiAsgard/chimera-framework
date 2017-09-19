#! /usr/bin/env node
'use strict';

const async = require('async')
const chimera = require('chimera-framework/core')
const testExecuteChain = chimera.test.testExecuteChain

async.series([
    // test migration
    (callback) => {testExecuteChain('Test migration',
        'tests/test-migration.yaml', [], {}, (result)=>{
            assert('_id' in output.structure.structure, 'output.structure does\'nt have id')
            assert('_id' in output.structure.user, 'output.user does\'nt have id')
            assert('_id' in output.structure.group, 'output.group does\'nt have id')
            assert('_id' in output.structure.config, 'output.config does\'nt have id')
            assert('_id' in output.structure.route, 'output.route does\'nt have id')
        }, callback)
    },
],
(result, error)=>{
    console.log('test complete')
})
