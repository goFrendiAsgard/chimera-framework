const async = require('async')
const assert = require('assert')
const cmd = require('node-cmd')
const chimera = require('chimera-framework/core')

const currentPath = process.cwd()

function testExecuteCommand(testName, command, expectedResult, callback){
    let startTime = process.hrtime(); 
    console.log('START ' + testName + ' ON nanosecond: ' + chimera.getFormattedNanoSecond(startTime) + '\n')
    cmd.get(command, function(err, data, stderr){
        let diff = process.hrtime(startTime);
        let endTime = process.hrtime(); 
        // show command
        console.log(command)
        // data contains several lines
        console.log(data)
        // get the last line
        lines = data.trim().split('\n')
        lastLine = lines.length == 0? '': lines[lines.length - 1]
        // show assertion or success
        console.log('END ' + testName + ' ON nanosecond: ' + chimera.getFormattedNanoSecond(endTime))
        console.log('EXECUTION TIME: ' + chimera.getFormattedNanoSecond(diff) + ' nanosecond')
        assert(lastLine == expectedResult, 'FAIL, Expected: '+expectedResult+', Actual: '+lastLine+'\n')
        console.log('SUCCESS\n')
        // run callback
        callback()
    })
}

function testExecuteYaml(testName, yaml, inputs, presets, expectedResult, callback){
    let startTime = process.hrtime(); 
    console.log('START ' + testName + ' ON nanosecond: ' + chimera.getFormattedNanoSecond(startTime) + '\n')
    chimera.executeYaml(yaml, inputs, presets, function(output, success){
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

    (callback) => {testExecuteYaml('Test executeYaml containing infinite loop, expect error',
        'tests/chain-infinite-loop.yaml', [0], {}, '', callback)},

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

    (callback) => {testExecuteYaml('Test executeYaml without presets',
        'tests/chain-minimal.yaml', [1, 5], {}, -23, callback)},

    (callback) => {testExecuteYaml('Test executeYaml with presets',
        'tests/chain-minimal.yaml', [1, 5], {'a':1, 'b':1}, -23, callback)},

    (callback) => {testExecuteYaml('Test executeYaml containing empty object',
        'tests/chain-empty.yaml', [0], {}, '', callback)},

], (result, error) => {
    assert(process.cwd() == currentPath, 'FAIL: current path doesn\'t set back')
    console.log('ALL TEST SUCCESS: there should be some error messages shown, but it is expected')
    console.log('If you see this message, it means the errors are catched.')

})
