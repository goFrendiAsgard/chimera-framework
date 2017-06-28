const async = require('async')
const assert = require('assert')
const cmd = require('node-cmd')
const chimera = require('chimera-framework/core')

function testExecuteCommand(testName, command, expectedResult, callback){
    cmd.get(command, function(data, err, stderr){
        console.log('START ' + testName + '\n')
        // show command
        console.log(command)
        // data contains several lines
        console.log(data)
        // get the last line
        lines = data.trim().split('\n')
        lastLine = lines[lines.length - 1]
        // show assertion or success
        assert(lastLine == expectedResult, testName + ' FAIL, Expected: '+expectedResult+', Actual: '+lastLine+'\n')
        console.log(testName + ' SUCCESS\n')
        // run callback
        callback()
    })
}

function testExecuteYaml(testName, yaml, inputs, presets, expectedResult, callback){
    chimera.executeYaml(yaml, inputs, presets, function(output, success){
        console.log('START ' + testName + '\n')
        console.log(output);
        assert(output == expectedResult, testName + ' FAIL, Expected: '+expectedResult+', Actual: '+lastLine+'\n')
        console.log(testName + ' SUCCESS\n')
        // run callback
        callback()
    });
}


// Run the test
async.series([

    (callback) => {testExecuteCommand('Test chain-complete', 
        'chimera tests/chain-complete.yaml 1 5', -23, callback)},

    (callback) => {testExecuteCommand('Test chain-minimal', 
        'chimera tests/chain-minimal.yaml 1 5', -23, callback)},

    (callback) => {testExecuteCommand('Test chain-implode', 
        'chimera tests/chain-implode.yaml 1 2 3', JSON.stringify(['1','2','3']), callback)},

    (callback) => {testExecuteCommand('Test chain-control-1', 
        'chimera tests/chain-control.yaml 5', 8, callback)},

    (callback) => {testExecuteCommand('Test chain-control-2', 
        'chimera tests/chain-control.yaml 12', 11, callback)},

    (callback) => {testExecuteYaml('Test executeYaml without presets',
        'tests/chain-minimal.yaml', [1, 5], {}, -23, callback)},

    (callback) => {testExecuteYaml('Test executeYaml with presets',
        'tests/chain-minimal.yaml', [1, 5], {'a':1, 'b':1}, -23, callback)},

], function(result, error){})
