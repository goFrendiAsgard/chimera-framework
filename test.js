#! /usr/bin/env node
'use strict';

const async = require('async')
const assert = require('assert')
const cmd = require('node-cmd')
const chimera = require('chimera-framework/core')

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

    // run chimera server
    (callback) => {
        console.log('Run chimera-serve on port 3010')
        serverProcess = cmd.get('PORT=3010 chimera-serve')
        console.log('The process id was ' + serverProcess.pid)
        callback()
    },


    // test execute chain

    (callback) => {testExecuteChain('Test executeChain without presets',
        'tests/chain-minimal.yaml', [1, 5], {}, -23, callback)},

    (callback) => {testExecuteChain('Test executeChain with presets',
        'tests/chain-minimal.yaml', [1, 5], {'a':1, 'b':1}, -23, callback)},

    (callback) => {testExecuteChain('Test executeChain containing empty object',
        'tests/chain-empty.yaml', [0], {}, '', callback)},

    (callback) => {testExecuteChain('Test executeChain containing infinite loop, expect error',
        'tests/chain-infinite-loop.yaml', [0], {}, '', callback)},

    // test execute command

    (callback) => {testExecuteCommand('Test error handling: no error',
        'chimera tests/chain-error-handling.yaml 6 6', 12, callback)},

    (callback) => {testExecuteCommand('Test error handling: error less',
        'chimera tests/chain-error-handling.yaml 5 6', '', callback)},

    (callback) => {testExecuteCommand('Test error handling: error more',
        'chimera tests/chain-error-handling.yaml 6 5', '', callback)},

    (callback) => {testExecuteCommand('Test Empty process with single argument',
        'chimera "(a)->-> b" 6', 6, callback)},

    (callback) => {testExecuteCommand('Test Empty process with two argument',
        'chimera "(a,b)->->(c)" 6 5', '[6,5]', callback)},

    (callback) => {testExecuteCommand('Test JSON instead of YAML',
        'chimera tests/chain-add.json 1 5', 6, callback)},

    (callback) => {testExecuteCommand('Test javascript arrow function',
        'chimera tests/chain-add-js.yaml 1 5', 6, callback)},

    (callback) => {testExecuteCommand('Test chain-complete',
        'chimera tests/chain-complete.yaml 1 5', -23, callback)},

    (callback) => {testExecuteCommand('Test chain-minimal',
        'chimera tests/chain-minimal.yaml 1 5', -23, callback)},

    (callback) => {testExecuteCommand('Test chain-inline-1',
        'chimera "(a, b) -> node tests/programs/add.js -> c" 1 5', 6, callback)},

    (callback) => {testExecuteCommand('Test chain-inline-2',
        'chimera "(a, b) -> node tests/programs/add.js" 1 5', 6, callback)},

    (callback) => {testExecuteCommand('Test chain-implode',
        'chimera tests/chain-implode.yaml 1 2 3', '1, 2, 3', callback)},

    (callback) => {testExecuteCommand('Test chain-control-1',
        'chimera tests/chain-control.yaml 5', 8, callback)},

    (callback) => {testExecuteCommand('Test chain-control-2',
        'chimera tests/chain-control.yaml 12', 11, callback)},

    (callback) => {testExecuteCommand('Test chain-simple-command',
        'chimera tests/chain-simple-command.yaml 5 6', 11, callback)},

    (callback) => {testExecuteCommand('Test chain-nested-control',
        'chimera tests/chain-nested-control.yaml','1112*1314**2122*2324**3132*3334**',callback)},

    (callback) => {testExecuteCommand('Test chain-complex-vars',
        'chimera tests/chain-complex-vars.yaml 5 6', -176, callback)},

    (callback) => {testExecuteCommand('Test chain-distributed',
        'chimera tests/chain-distributed.yaml 5 4 http://localhost:3010', 18, callback)},

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
    console.log('Press Ctrl+c to exit')
})
