#! /usr/bin/env node
'use strict';

const async = require('async')
const assert = require('assert')
const chimera = require('chimera-framework/core')
const cmd = chimera.cmd
const childProcess = require('child_process')

const currentPath = process.cwd()
let serverProcess = null

function testExecuteCommand(testName, command, expectedResult, callback){
    let startTime = process.hrtime();
    console.log('START ' + testName + ' ON nanosecond: ' + chimera.getFormattedNanoSecond(startTime) + '\n')
    cmd.get(command, function(err, data, stderr){
        let diff = process.hrtime(startTime);
        let endTime = process.hrtime();
        // show command
        console.log(command)
        // show data
        console.log(data)
        // get the last line
        let lines = data.trim().split('\n')
        let lastLine = lines.length == 0? '': lines[lines.length - 1]
        // show assertion or success
        console.log('END ' + testName + ' ON nanosecond: ' + chimera.getFormattedNanoSecond(endTime))
        console.log('EXECUTION TIME: ' + chimera.getFormattedNanoSecond(diff) + ' nanosecond')
        assert(lastLine == expectedResult, 'FAIL, Expected: '+expectedResult+', Actual: '+lastLine+'\n')
        console.log('SUCCESS\n')
        // run callback
        callback()
    })
}

function testExecuteChain(testName, chain, inputs, presets, expectedResult, callback){
    let startTime = process.hrtime();
    console.log('START ' + testName + ' ON nanosecond: ' + chimera.getFormattedNanoSecond(startTime) + '\n')
    chimera.executeChain(chain, inputs, presets, function(output, success){
        let diff = process.hrtime(startTime);
        let endTime = process.hrtime();
        console.log(output);
        console.log('END ' + testName + ' ON nanosecond: ' + chimera.getFormattedNanoSecond(endTime))
        console.log('EXECUTION TIME: ' + chimera.getFormattedNanoSecond(diff) + ' nanosecond')
        assert(output == expectedResult, 'FAIL, Expected: '+expectedResult+', Actual: '+output+'\n')
        console.log('SUCCESS\n')
        // run callback
        callback()
    });
}


// Run the test
async.series([

    // test database
    (callback) => {
        let startTime = process.hrtime();
        let chain = 'tests/mongo-driver.yaml'
        console.log('START mongo-driver testing ON nanosecond: ' + chimera.getFormattedNanoSecond(startTime) + '\n')
        chimera.executeChain(chain, [], [], function(output, success){
            let diff = process.hrtime(startTime);
            let endTime = process.hrtime();
            console.log(output);
            console.log('END mongo-driver testing ON nanosecond: ' + chimera.getFormattedNanoSecond(endTime))
            console.log('EXECUTION TIME: ' + chimera.getFormattedNanoSecond(diff) + ' nanosecond')
            assert(output.insert_doc.name == 'Tono Stark', 'FAIL, insert_doc: ' + JSON.stringify(output.insert_doc) + '\n')
            assert(output.update_doc.name == 'Toni Stark', 'FAIL, update_doc: ' + JSON.stringify(output.update_doc) + '\n')
            assert(output.another_insert_doc.name == 'Tono Stark', 'FAIL, another_insert_doc: ' + JSON.stringify(output.another_insert_doc) + '\n')
            console.log(output.insert_bulk_docs)
            assert(output.insert_bulk_docs.length == 2, 'FAIL, insert_bulk_docs: ' + JSON.stringify(output.insert_bulk_docs) + '\n')
            assert(output.update_bulk_docs.length == 3, 'FAIL, update_bulk_docs: ' + JSON.stringify(output.update_bulk_docs) + '\n')
            for(let i=0; i<3; i++){
                assert(output.update_bulk_docs[i].affiliation == 'Avenger', 'FAIL, update_bulk_docs['+i+']: ' + JSON.stringify(output.update_bulk_docs[i]) + '\n')
            }
            assert(output.superman_doc.name == 'Clark Kent', 'FAIL, insert_doc: ' + JSON.stringify(output.superman_doc) + '\n')
            assert(output.find_docs.length == 4, 'FAIL, find_docs: ' + JSON.stringify(output.find_docs) + '\n')
            assert(output.find_avenger_docs.length == 3, 'FAIL, find_avenger_docs: ' + JSON.stringify(output.find_avenger_docs) + '\n')
            assert(output.find_sharingan_docs.length == 5, 'FAIL, find_sharingan_docs: ' + JSON.stringify(output.find_sharingan_docs) + '\n')
            assert(output.permanent_remove_result.ok == 1, 'FAIL, permanent_remove_result: ' + JSON.stringify(output.permanent_remove_result) + '\n')
            assert(output.permanent_remove_result.n == 5, 'FAIL, permanent_remove_result: ' + JSON.stringify(output.permanent_remove_result) + '\n')
            console.log('SUCCESS\n')
            // run callback
            callback()
        });
    },

    // test execute chain

    (callback) => {testExecuteChain('Test executeChain without presets',
        'tests/minimal.yaml', [1, 5], {}, -23, callback)},

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
