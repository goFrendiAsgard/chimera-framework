#! /usr/bin/env node
'use strict'

module.exports = {
    'executeChain' : executeChain
}

// imports
const async = require('neo-async')
const fs = require('fs')
const yaml = require('js-yaml')
const stringify = require('json-stringify-safe')
const path = require('path')
const safeEval = require('safe-eval')
const cmd = require('./cmd.js')
const util = require('./util.js')
const corePreprocessor = require('./core-preprocessor.js')

// constants
const $ = {
    'runChain': runChain,
    'loadJs': loadJs,
    'assignValue': assignValue,
}
const SILENT = 0
const VERBOSE = 1
const VERY_VERBOSE = 2
const ULTRA_VERBOSE = 3

// initial value of VARIABLES
let VARIABLES = {}

let getTrueRootChain = corePreprocessor.getTrueRootChain
let getInspectedObject = corePreprocessor.getInspectedObject

function assignValue (...args) {
    // the last argument is callback
    let callback = args.pop()
    // determine output
    let output
    if (args.length === 1) {
        output = args[0]
    } else {
        output = args
    }
    // run the callback
    callback(null, output)
}

function loadJs (moduleName, namespace = null) {
    let loadedObject = require(moduleName)
    if (util.isNullOrUndefined(namespace)) {
        return loadedObject
    }
    let namespacePartList = namespace 
    for (let namespacePart of namespacePartList) {
        loadedObject = loadedObject[namespacePart]
    }
    return loadedObject
}

function runChain (...args) {
    let callback = args.pop()
    // get the chain
    let chain = args.shift()
    executeChain(chain, args, {}, callback)
}

function getInsNameAsArray (ins) {
    if (util.isString(ins)) {
        return util.smartSplit(ins, ',')
    } else if (util.isArray(ins)) {
        return ins
    }
    return []
}

function normalizeOutputValue (result) {
    if (util.isNullOrUndefined(result)) {
        result = ''
    } else if (util.isString(result)) {
        result = result.trim('\n')
    } else if (util.isArray(result) || util.isRealObject(result)) {
        result = stringify(result)
    }
    return result
}

function defineDefaultFinalCallback (finalCallback) {
    if (util.isFunction(finalCallback)) {
        return finalCallback
    }
    return (error, value) => {
        if (error) {
            console.error(error)
        } else {
            console.log(value)
        }
    }
}

function wrapFinalCallback (chain, finalCallback) {
    return (error, allValues) => {
        finalCallback = defineDefaultFinalCallback(finalCallback)
        let result = evaluateStatement(chain.out)
        result = normalizeOutputValue(result)
        finalCallback(error, result)
    }
}

function evaluateStatement (key, log = false) {
    try {
        let context = Object.assign({}, VARIABLES)
        return safeEval(key, context)
    } catch (error) {
        if(log){
            logMessage(error, VERBOSE)
        }
        return null
    }
}

function createNestedChainActions (chain, finalCallback) {
    let actions = []
    for (let subChain of chain.chains) {
        actions.push((next) => {
            let chainRunner = createChainRunner(subChain, finalCallback)
            chainRunner(next)
        })
    }
    return actions
}

function createSingleChainCallback(chain, next, finalCallback){
    return (error, result) => {
        if (error) {
            finalCallback(error, null)
        } else {
            eval('VARIABLES.'+chain.out+' = result')
            next()
        }
    }
}

function createSingleChainAction (chain, finalCallback) {
    return (next) => {
        // prepare input
        let inputs = evaluateStatement('[' + chain.ins + ']')
        // add VARIABLES as the first input (context)
        inputs.unshift(VARIABLES)
        // prepare command callback
        let commandCallback = createSingleChainCallback(chain, next, finalCallback)
        // add command callback as the last input
        inputs.push(commandCallback)
        // run the command
        try {
            chain.compiledCommand(...inputs)
        } catch (error) {
            finalCallback(error, null)
        }
    }
}

function createChainRunner (chain, finalCallback, firstTime = true) {
    let isHavingChildren = 'chains' in chain && util.isArray(chain.chains)
    let asyncWorker = isHavingChildren && chain.mode === 'parallel' ? async.parallel : async.series
    return (callback) => {
        let actions = []
        // checking chain.if condition (only for firstTime), because on the second time the action is triggered by `while` condition
        if (firstTime && !evaluateStatement(chain.if)) {
            // `if` condition is wrong, stop here
            return asyncWorker(actions, callback)
        }
        // at this point, chain.if condition resolved
        if ('chains' in chain && util.isArray(chain.chains)) {
            // this is a nested chain
            let nestedChainActions = createNestedChainActions(chain, finalCallback)
            actions = actions.concat(nestedChainActions)
        } else if ('command' in chain) {
            // this is a single chain
            let singleCommandAction = createSingleChainAction(chain, finalCallback)
            actions.push(singleCommandAction)
        }
        // checking chain.while condition
        if (!evaluateStatement(chain.while)) {
            // `while` condition is wrong, stop here
            return asyncWorker(actions, callback)
        }
        // while condition is correct, now we need to do this again
        actions.push(createChainRunner(chain, finalCallback, false))
        return asyncWorker(actions, callback)
    }
}

function runRootChain (chain, insValue = [], vars = {}, finalCallback = null) {
    // get the root chain
    chain = getTrueRootChain(chain)
    logMessage('CHAIN SEMANTIC : '+getInspectedObject(chain), VERBOSE)
    // prepare variables
    VARIABLES = Object.assign({}, {$}, {'_ans': null,
        '_error': false,
        '_error_message': '',
        '_init_cwd': util.addTrailingSlash(process.cwd()),
        '_chain_cwd': util.addTrailingSlash(process.cwd()),
        '_verbose': SILENT,
        '_description': ''}, vars)
    // get ins and embed it into variables
    let ins = getInsNameAsArray(chain.ins)
    for (let i=0; i<ins.length; i++) {
        let key = ins[i]
        if (i < insValue.length) {
            VARIABLES[key] = insValue[i]
        } else if (!(key in VARIABLES)) {
            VARIABLES[key] = null
        }
    }
    logMessage('INITIAL STATE : '+getInspectedObject(VARIABLES), VERBOSE)
    // get `out` and embed it into variables
    if (!(chain.out in VARIABLES)) {
        VARIABLES[chain.out] = null
    }
    // prepare final callback
    finalCallback = wrapFinalCallback(chain, finalCallback)
    // create chain runner and run it
    let chainRunner = createChainRunner(chain, finalCallback, true)
    async.series([chainRunner], finalCallback)
}

function getDecodedParameters (args) {
    let ins = []
    let vars = {}
    let callback = null
    if(args.length === 1){
        if (util.isFunction(args[0])) {
            callback = args[0]
        } else if (util.isArray(args[0])) {
            ins = args[0]
        } else if (util.isRealObject(args[0])) {
            vars = args[0]
        }
    } else if (args.length === 2  && util.isArray(args[0])) {
        ins = args[0]
        if (util.isFunction(args[1])) {
            callback = args[1]
        } else if (util.isRealObject(args[1])) {
            vars = args[1]
        }
    } else if (args.length === 2 && util.isRealObject(args[0])) {
        vars = args[0]
        if (util.isFunction(args[1])) {
            callback = args[1]
        }
    } else if (util.isArray(args[0])) {
        ins = args[0]
    } else if (util.isRealObject(args[1])) {
        vars = args[1]
    } else if (util.isFunction(args[2])) {
        callback = args[2]
    }
    return {'ins': ins, 'vars': vars, 'callback': callback}
}

function executeChain(chain, ...args){
    let decodedParameters = getDecodedParameters(args)
    let ins = decodedParameters['ins'] 
    let vars = decodedParameters['vars'] 
    let callback = decodedParameters['out']
    util.readJsonOrYaml(chain, (error, chainObj) => {
        console.error(error)
        if(!error){
            let chainPath = path.resolve(chain)
            let dirName = path.dirname(chainPath)
            let baseName = path.basename(chainPath)
            vars._description = 'FILE: '+baseName
            vars._chain_cwd = util.addTrailingSlash(dirName)
            vars._init_cwd = util.addTrailingSlash(process.cwd())
            return runRootChain(chainObj, ins, vars, callback)
        }
        util.parseJsonOrYaml(chain, function(error, chainObj){
            if(!error){
                vars._description = 'SCRIPT: ' + util.sliceString(chain, 50)
                runRootChain(chainObj, ins, vars, callback)
            }
            else{
                console.error(error)
            }
        })
    })
}

function logMessage(message, verbosity){
    let description = evaluateStatement('_description')
    let isoDate = (new Date()).toISOString()
    console.error('['+description+' '+isoDate+'] \n'+message)
}
