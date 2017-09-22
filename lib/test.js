#! /usr/bin/env node
'use strict';

let cmd = require('./cmd.js')
let core = require('./core.js')
let util = require('./util.js')
let assert = require('assert')

function createDefaultAsserter(expectedResult){
    if(util.isFunction(expectedResult)){
        return expectedResult
    }
    return function(output){
        assert(output == expectedResult, 'FAIL, Expected: '+expectedResult+', Actual: '+output)
    }
}

function testChain(testName, chain, inputs, presets, expectedResult, callback){
    // presets can be ommitted
    if(util.isNullOrUndefined(callback)){
        callback = expectedResult
        expectedResult = presets
        presets = {}
    }
    let startTime = process.hrtime();
    console.warn('START ' + testName + ' ON nanosecond: ' + util.formatNanoSecond(startTime) + '\n')
    core.executeChain(chain, inputs, presets, function(output, success, errorMessage){
        let diff = process.hrtime(startTime);
        let endTime = process.hrtime();
        // show chain
        console.warn(chain)
        // show output
        console.warn(output);
        // do assertion
        let asserter = createDefaultAsserter(expectedResult)
        asserter(output)
        console.warn('END ' + testName + ' ON nanosecond: ' + util.formatNanoSecond(endTime))
        console.warn('EXECUTION TIME: ' + util.formatNanoSecond(diff) + ' nanosecond')
        callback()
    });
}

function testCmd(testName, command, expectedResult, callback){
    let startTime = process.hrtime();
    console.warn('START ' + testName + ' ON nanosecond: ' + util.formatNanoSecond(startTime) + '\n')
    cmd.get(command, function(err, data, stderr){
        let diff = process.hrtime(startTime);
        let endTime = process.hrtime();
        data = data.trim('\n')
        // show command
        console.warn(command)
        // show data
        console.warn(data)
        // do assertion
        let asserter = createDefaultAsserter(expectedResult)
        asserter(data)
        console.warn('END ' + testName + ' ON nanosecond: ' + util.formatNanoSecond(endTime))
        console.warn('EXECUTION TIME: ' + util.formatNanoSecond(diff) + ' nanosecond')
        callback()
    })
}

module.exports = {
    'testChain' : testChain,
    'testCmd' : testCmd,
}
