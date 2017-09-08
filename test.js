#! /usr/bin/env node
'use strict';

const async = require('async')
const assert = require('assert')
const chimera = require('chimera-framework/core')
const cmd = chimera.cmd
const childProcess = require('child_process')

const currentPath = process.cwd()
let serverProcess = null

function createAsserter(expectedResult){
    if(typeof(expectedResult) == 'function'){
        return expectedResult
    }
    return function(output){
        assert(output == expectedResult, 'FAIL, Expected: '+expectedResult+', Actual: '+output)
    }
}

function testExecuteCommand(testName, command, expectedResult, callback){
    let startTime = process.hrtime();
    console.warn('START ' + testName + ' ON nanosecond: ' + chimera.getFormattedNanoSecond(startTime) + '\n')
    cmd.get(command, function(err, data, stderr){
        let diff = process.hrtime(startTime);
        let endTime = process.hrtime();
        data = data.trim('\n')
        
        // show command
        console.warn(command)
        // show data
        console.warn(data)
        // do assertion
        let asserter = createAsserter(expectedResult)
        asserter(data)
        console.warn('END ' + testName + ' ON nanosecond: ' + chimera.getFormattedNanoSecond(endTime))
        console.warn('EXECUTION TIME: ' + chimera.getFormattedNanoSecond(diff) + ' nanosecond')
        callback()
    })
}

function testExecuteChain(testName, chain, inputs, presets, expectedResult, callback){
    let startTime = process.hrtime();
    console.warn('START ' + testName + ' ON nanosecond: ' + chimera.getFormattedNanoSecond(startTime) + '\n')
    chimera.executeChain(chain, inputs, presets, function(output, success, errorMessage){
        let diff = process.hrtime(startTime);
        let endTime = process.hrtime();
        // show chain
        console.warn(chain)
        // show output
        console.warn(output);
        // do assertion
        let asserter = createAsserter(expectedResult)
        asserter(output)
        console.warn('END ' + testName + ' ON nanosecond: ' + chimera.getFormattedNanoSecond(endTime))
        console.warn('EXECUTION TIME: ' + chimera.getFormattedNanoSecond(diff) + ' nanosecond')
        callback()
    });
}

let mongoDbAsserter = (output)=>{
    try{
        output = JSON.parse(output)
    }
    catch(error){}
    assert(output.insert_doc.name == 'Tono Stark', 'FAIL, insert_doc.name should be Tono Stark\n')
    assert(output.update_doc.name == 'Toni Stark', 'FAIL, update_doc.name should be Toni Stark\n')
    assert(output.another_insert_doc.name == 'Tono Stark', 'FAIL, another_insert_doc should be Tono Stark\n')
    assert(output.insert_bulk_docs.length == 2, 'FAIL, insert_bulk_docs\n')
    assert(output.update_bulk_docs.length == 3, 'FAIL, update_bulk_docs\n')
    for(let i=0; i<3; i++){
        assert(output.update_bulk_docs[i].affiliation == 'Avenger', 'FAIL, update_bulk_docs['+i+'].affiliation should be Avenger\n')
    }
    assert(output.superman_doc.name == 'Clark Kent', 'FAIL, superman_doc.name should be Clark Kent\n')
    assert(output.find_docs.length == 4, 'FAIL, find_docs.length should be 4\n')
    assert(output.find_limited_sorted_docs[0].name == 'Clark Kent', 'FAIL, find_limited_sorted_docs[0].name should be Clark Kent\n')
    assert(output.find_limited_sorted_docs.length == 2, 'FAIL, find_limited_sorted_docs.length should be 2\n')
    assert(output.find_avenger_docs.length == 3, 'FAIL, find_avenger_docs.length should be 3\n')
    assert(output.find_sharingan_docs.length == 5, 'FAIL, find_sharingan_docs.length should be 5\n')
    assert(output.permanent_remove_result.ok == 1, 'FAIL, permanent_remove_result.ok should be 1\n')
    assert(output.permanent_remove_result.n == 5, 'FAIL, permanent_remove_result.n should be 5\n')
}


// Run the test
async.series([

    // test database
    (callback) => {testExecuteCommand('Test mongo driver', 
        'chimera "tests/mongo-driver.yaml"', mongoDbAsserter, callback)
    },
    (callback) => {testExecuteChain('Test mongo driver', 
        'tests/mongo-driver.yaml', [], {}, mongoDbAsserter, callback)
    },

    // test executeChain with various 
    (callback) => {
        chimera.executeChain('tests/increment.yaml', function(output, error, errorMessage){
            assert(output == 1, 'FAIL, Expected : 1, Actual : '+output)
            console.log('Success: executeChain without input and preset')
            callback()
        })
    },
    (callback) => {
        chimera.executeChain('tests/increment.yaml', {'inc':5}, function(output, error, errorMessage){
            assert(output == 5, 'FAIL, Expected : 5, Actual : '+output)
            console.log('Success: executeChain without input ')
            callback()
        })
    },
    (callback) => {
        chimera.executeChain('tests/increment.yaml', [1], function(output, error, errorMessage){
            assert(output == 2, 'FAIL, Expected : 2, Actual : '+output)
            console.log('Success: executeChain without preset ')
            callback()
        })
    },

    // test execute chain

    (callback) => {testExecuteChain('Test executeChain without presets',
        'tests/minimal.yaml', [1, 5], {}, -23, callback)
    },

    (callback) => {testExecuteChain('Test executeChain with presets',
        'tests/minimal.yaml', [1, 5], {'a':1, 'b':1}, -23, callback)},

    (callback) => {testExecuteChain('Test executeChain containing empty object',
        'tests/empty.yaml', [0], {}, '', callback)},

    (callback) => {testExecuteChain('Test executeChain containing infinite loop, expect error',
        'tests/infinite-loop.yaml', [0], {}, '', callback)},

    // test execute command

    (callback) => {testExecuteCommand('Test error handling: no error',
        'chimera tests/error-handling.yaml 6 6', 12, callback)},

    (callback) => {testExecuteCommand('Test error handling: error less',
        'chimera tests/error-handling.yaml 5 6', '', callback)},

    (callback) => {testExecuteCommand('Test error handling: error more',
        'chimera tests/error-handling.yaml 6 5', '', callback)},

    (callback) => {testExecuteCommand('Test Empty process with single argument',
        'chimera "(a)->-> b" 6', 6, callback)},

    (callback) => {testExecuteCommand('Test Empty process with two argument',
        'chimera "(a,b)->->(c)" 6 5', '[6,5]', callback)},

    (callback) => {testExecuteCommand('Test JSON instead of YAML',
        'chimera tests/add.json 1 5', 6, callback)},

    (callback) => {testExecuteCommand('Test javascript arrow function',
        'chimera tests/add-js.yaml 1 5', 6, callback)},

    (callback) => {testExecuteCommand('Test complete',
        'chimera tests/complete.yaml 1 5', -23, callback)},

    (callback) => {testExecuteCommand('Test minimal',
        'chimera tests/minimal.yaml 1 5', -23, callback)},

    (callback) => {testExecuteCommand('Test inline-1',
        'chimera "(a, b) -> node tests/programs/add.js -> c" 1 5', 6, callback)},

    (callback) => {testExecuteCommand('Test inline-2',
        'chimera "(a, b) -> node tests/programs/add.js" 1 5', 6, callback)},

    (callback) => {testExecuteCommand('Test implode',
        'chimera tests/implode.yaml 1 2 3', '1, 2, 3', callback)},

    (callback) => {testExecuteCommand('Test control-1',
        'chimera tests/control.yaml 5', 8, callback)},

    (callback) => {testExecuteCommand('Test control-2',
        'chimera tests/control.yaml 12', 11, callback)},

    (callback) => {testExecuteCommand('Test simple-command',
        'chimera tests/simple-command.yaml 5 6', 11, callback)},

    (callback) => {testExecuteCommand('Test nested-control',
        'chimera tests/nested-control.yaml','1112*1314**2122*2324**3132*3334**',callback)},

    (callback) => {testExecuteCommand('Test complex-vars',
        'chimera tests/complex-vars.yaml 5 6', -176, callback)},

    (callback) => {testExecuteCommand('Test add',
        'chimera tests/add.yaml 5 6', 11, callback)},

    (callback) => {testExecuteCommand('Test add-module',
        'chimera tests/add-module.yaml 5 6', 11, callback)},

    (callback) => {testExecuteCommand('Test add-module-twice',
        'chimera tests/add-module-twice.yaml 5 6', 17, callback)},

    (callback) => {testExecuteCommand('Test arithmetic-module',
        'chimera tests/arithmetic-module.yaml 5 6 "*"', 30, callback)},

    // run chimera server
    (callback) => {
        let callbackExecuted = false
        let env = chimera.deepCopyObject(process.env)
        env['PORT'] = 3010
        serverProcess = childProcess.spawn('chimera-serve', [], {'env': env, 'cwd':process.cwd()})
        // if error, show message and kill
        serverProcess.on('error', (err)=>{
            console.error(err)
            serverProcess.kill()
        })
        // if success, run callback
        serverProcess.stdout.on('data', function(stdout){
            console.log(String(stdout))
            if(!callbackExecuted){
                callbackExecuted = true
                callback()
            }
        })
        serverProcess.stderr.on('data', function(stderr){
            console.error(String(stderr))
        })
    },

    // test distributed
    (callback) => {testExecuteCommand('Test distributed',
        'chimera tests/distributed.yaml 5 4 http://localhost:3010', 18, callback)},

    // kill chimera server
    (callback) => {
        serverProcess.kill()
        callback()
    },

], (result, error) => {
    assert(process.cwd() == currentPath, 'FAIL: current path doesn\'t set back')
    console.log('ALL TEST SUCCESS: No error encountered or all errors were caught')
    console.log('NOTE: Please make sure you have run "sudo npm link first" before running the test')
    console.log('      Otherwise, please re-run the test.')
})
