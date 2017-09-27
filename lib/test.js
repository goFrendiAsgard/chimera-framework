#! /usr/bin/env node
'use strict';

let cmd = require('./cmd.js')
let core = require('./core.js')
let util = require('./util.js')
let assert = require('assert')

function isExpectationMeet(output, expected, level=100){
    if(level == 0 || util.isFunction(output) || util.isFunction(expected)){
        // if we can't reach them anymore, assume they are not equal 
        // if one of them is function, also assume they are not equal
        return false
    }
    else if((util.isArray(expected) || util.isRealObject(expected)) && (util.isArray(expected) || util.isRealObject(expected))){
        // expected and output are object or array
        for(let key in expected){
            if(!(key in output)){
                return false
            }
            return isExpectationMeet(output[key], expected[key], level-1)
        }
    }
    else{
        return output == expected
    }
}

function createDefaultAsserter(expectedResult){
    if(util.isFunction(expectedResult)){
        return expectedResult
    }
    return function(error, output){
        assert(isExpectationMeet(output, expectedResult), 'FAIL, Expected: '+expectedResult+', Actual: '+output)
    }
}

function testChain(testName, chain, inputs, presets, expectedResult, callback){
    if(util.isNullOrUndefined(callback) && util.isNullOrUndefined(expectedResult)){
        callback = presets
        expectedResult = inputs
        inputs = []
    }
    else if(util.isNullOrUndefined(callback)){
        // presets can be ommitted
        callback = expectedResult
        expectedResult = presets
        presets = {}
    }
    let startTime = process.hrtime();
    console.warn('START ' + testName + ' ON nanosecond: ' + util.formatNanoSecond(startTime) + '\n')
    core.executeChain(chain, inputs, presets, function(error, output){
        let diff = process.hrtime(startTime);
        let endTime = process.hrtime();
        // show chain
        console.warn(chain)
        // show error
        if(error){
            console.error(error)
        }
        // show output
        console.warn(output);
        // do assertion
        let asserter = createDefaultAsserter(expectedResult)
        asserter(error, output)
        console.warn('END ' + testName + ' ON nanosecond: ' + util.formatNanoSecond(endTime))
        console.warn('EXECUTION TIME: ' + util.formatNanoSecond(diff) + ' nanosecond')
        callback()
    });
}

function testCmd(testName, command, expectedResult, callback){
    let startTime = process.hrtime();
    console.warn('START ' + testName + ' ON nanosecond: ' + util.formatNanoSecond(startTime) + '\n')
    cmd.get(command, function(error, data, stderr){
        let diff = process.hrtime(startTime);
        let endTime = process.hrtime();
        data = data.trim('\n')
        // show command
        console.warn(command)
        // show error
        if(error){
            console.error(error.stack)
        }
        else if(stderr){
            console.error(stderr)
        }
        // show data
        console.warn(data)
        // do assertion
        let asserter = createDefaultAsserter(expectedResult)
        asserter(error, data)
        console.warn('END ' + testName + ' ON nanosecond: ' + util.formatNanoSecond(endTime))
        console.warn('EXECUTION TIME: ' + util.formatNanoSecond(diff) + ' nanosecond')
        callback()
    })
}

function testFunction(testName, fn, ...args){
    // determine callback and expected result
    let callback = args[args.length-1]
    let expectedResult = args[args.length-2]
    args = args.slice(0, args.length-2)
    let startTime = process.hrtime();
    console.warn('START ' + testName + ' ON nanosecond: ' + util.formatNanoSecond(startTime) + '\n')
    let wrappedCallback = (error, result) => {
        let diff = process.hrtime(startTime);
        let endTime = process.hrtime();
        // show error
        if(error){
            console.error(error.stack)
        }
        // show data
        console.warn(result)
        // do assertion
        let asserter = createDefaultAsserter(expectedResult)
        asserter(error, result)
        console.warn('END ' + testName + ' ON nanosecond: ' + util.formatNanoSecond(endTime))
        console.warn('EXECUTION TIME: ' + util.formatNanoSecond(diff) + ' nanosecond')
        callback()
    }
    args.push(wrappedCallback)
    fn.apply(fn,args)
}

module.exports = {
    'testChain' : testChain,
    'testCmd' : testCmd,
    'testFunction' : testFunction,
}
