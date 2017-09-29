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
    return output == expected
}

function createDefaultAsserter(expectedResult){
    if(util.isFunction(expectedResult)){
        return expectedResult
    }
    return function(error, output){
        assert(isExpectationMeet(output, expectedResult),
            'FAIL, Expected: '+JSON.stringify(expectedResult)+', Actual: '+JSON.stringify(output))
    }
}

function doTheTest(testName, startTime, result, error, expectedResult, callback){
    let diff = process.hrtime(startTime);
    let endTime = process.hrtime();
    // show error
    if(error){
        console.error(error)
    }
    // remove \n
    if(util.isString(result)){
        result = result.trim('\n')
    }
    if(util.isString(expectedResult)){
        expectedResult = expectedResult.trim('\n')
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

function testFunction(testName, fn, ...args){
    let callback = args[args.length-1]
    let expectedResult = args[args.length-2]
    args = args.slice(0, args.length-2)
    let startTime = process.hrtime();
    console.warn('START ' + testName + ' ON nanosecond: ' + util.formatNanoSecond(startTime) + '\n')
    // run the function
    let result, error
    try{
        result = fn.apply(fn,args)
    }
    catch(err){
        error = err
    }
    doTheTest(testName, startTime, result, error, expectedResult, callback)
}

function testFunctionWithCallback(testName, fn, ...args){
    // determine callback and expected result
    let callback = args[args.length-1]
    let expectedResult = args[args.length-2]
    args = args.slice(0, args.length-2)
    let startTime = process.hrtime();
    console.warn('START ' + testName + ' ON nanosecond: ' + util.formatNanoSecond(startTime) + '\n')
    let wrappedCallback = (error, result) => {
        doTheTest(testName, startTime, result, error, expectedResult, callback)
    }
    args.push(wrappedCallback)
    fn.apply(fn,args)
}

function testCmd(testName, ...args){
    args.unshift(cmd.get)
    args.unshift(testName)
    testFunctionWithCallback.apply(testFunctionWithCallback, args)
}

function testChain(testName, ...args){
    args.unshift(core.executeChain)
    args.unshift(testName)
    console.error(args)
    testFunctionWithCallback.apply(testFunctionWithCallback, args)
}

module.exports = {
    'testChain' : testChain,
    'testCmd' : testCmd,
    'testFunctionWithCallback' : testFunctionWithCallback,
    'testFunction' : testFunction,
}
