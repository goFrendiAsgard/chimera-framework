#! /usr/bin/env node
'use strict'

module.exports = {
    executeChain
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
const preprocessor = require('./core-preprocessor.js')
const readline = require('readline');

// constants
const $ = {
    'runChain': runChain,
    'loadJs': loadJs,
    'assignValue': assignValue,
    'prompt': readInputAndCallback,
    'print': printAndCallback,
    'concat': concatAndCallback,
    'join': joinAndCallback,
    'split': splitAndCallback,
    'push': pushToArrayAndCallback
}
const SILENT = 0
const VERBOSE = 1
const VERY_VERBOSE = 2
const ULTRA_VERBOSE = 3

// initial value of VARIABLES
let VARIABLES = {}

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

function readInputAndCallback (textPrompt = '', callback) {
    let rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
    rl.question(textPrompt + ' ', (answer) => {
        rl.close();
        callback(null, answer)
    });
}

function pushToArrayAndCallback (array, value, callback) {
    array.push(value)
    callback(null, array)
}

function printAndCallback (message = '', callback) {
    console.log(message)
    callback(null, message)
}

function concatAndCallback (...args) {
    let callback = args.pop()
    let result = ''
    for (let value of args) {
        result += String(value)
    }
    callback(null, result)
}

function joinAndCallback (...args) {
    let callback = args.pop()
    let value = []
    let delimiter = ''
    if (args.length == 1) {
        value = args[0]
    } else if (args.length > 1) {
        value = args[0]
        delimiter = args[1]
    }
    callback(null, value.join(delimiter))
}

function splitAndCallback (...args) {
    let callback = args.pop()
    let value = '' 
    let delimiter = ''
    if (args.length == 1) {
        value = args[0]
    } else if (args.length > 1) {
        value = args[0]
        delimiter = args[1]
    }
    callback(null, value.split(delimiter))
}

function getPublishedState () {
    let filteredState = preprocessor.getFilteredObject(VARIABLES, ['$'])
    return preprocessor.getInspectedObject(filteredState)
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

function showCurrentError () {
    if (VARIABLES._error) {
        logMessage('Chain Error : ' + VARIABLES._error_message)
        if ('_error_object' in VARIABLES && util.isRealObject(VARIABLES._error_object)) {
            logMessage(VARIABLES._error_object)
        } 
    }
}

function defineDefaultFinalCallback (finalCallback) {
    if (util.isFunction(finalCallback)) {
        return finalCallback
    }
    return (error, value) => {
        if (VARIABLES._error) {
            showCurrentError()
        } else if (error) {
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

function evaluateStatement (statement, log = false) {
    try {
        return safeEval(statement, VARIABLES)
    } catch (error) {
        VARIABLES._error = true
        VARIABLES._error_message = 'Error evaluating statement:\n' + statement + '\n' + error.message
        VARIABLES._error_object = error
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

function getVariableTrueName (name) {
    let newName
    while (true) {
        newName = name.replace(/\[[^\[\]]+\]/g, (element) => {
            let value = preprocessor.getUnwrapped(element)
            let evaluatedValue
            try {
                evaluatedValue = safeEval(value, VARIABLES)
            } catch (error) {
                evaluatedValue = value
            }
            return '[' + evaluatedValue + ']'
        })
        if (newName === name) {
            break
        }
        name = newName
    }
    // turn `array index` mode into `object key` mode
    name = name.replace(/(\]\[)|(\[)/g, '.')
    name = name.replace(/\]$/g, '')
    return name
}

function setVariable (name, value) {
    name =  getVariableTrueName(name)
    let variable = VARIABLES
    let nameParts = name.split('.')
    for (let i=0; i<nameParts.length; i++) {
        let namePart = nameParts[i]
        if (i === nameParts.length -1) {
            return variable[namePart] = value
        } else if (util.isNullOrUndefined(variable[namePart])) {
            variable[namePart] = {}
        }
        variable = variable[namePart]
    }
}

function createSingleChainCallback(chain, next, finalCallback){
    return (error, result) => {
        if (error) {
            VARIABLES._error = true
            VARIABLES._error_message = error.message
            VARIABLES._error_object = error
            return finalCallback(error, null)
        }
        try {
            setVariable(chain.out, result)
            //eval('VARIABLES.'+getVariableTrueName(chain.out)+' = result')
            logMessage('(chain #' + chain.id + ') Set '+chain.out+' into: ' + preprocessor.getInspectedObject(evaluateStatement(chain.out)), VERY_VERBOSE)
            logMessage('(chain #' + chain.id + ') state after execution:\n' + getPublishedState(), ULTRA_VERBOSE)
            next()
        } catch (evalError) {
            VARIABLES._error = true
            VARIABLES._error_message = evalError.message
            VARIABLES._error_object = evalError
            return finalCallback(evalError, null)
        }
    }
}

function createSingleChainAction (chain, finalCallback) {
    return (next) => {
        try {
            // prepare input
            let inputStatement = '[' + chain.ins + ']'
            logMessage('(chain #' + chain.id + ') input statement: ' + inputStatement, VERBOSE)
            let inputs = evaluateStatement(inputStatement)
            logMessage('(chain #' + chain.id + ') input values: ' + preprocessor.getInspectedObject(inputs), VERBOSE)
            if(VARIABLES._error) {
                return finalCallback(VARIABLES._error_object, null)
            }
            // add VARIABLES as the first input (context)
            inputs.unshift(VARIABLES)
            // prepare command callback
            let commandCallback = createSingleChainCallback(chain, next, finalCallback)
            // add command callback as the last input
            inputs.push(commandCallback)
            // run the command, and continue to the next chain
            chain.compiledCommand(...inputs)
        } catch (error) {
            VARIABLES._error = true
            VARIABLES._error_message = error.message
            VARIABLES._error_object = error
            finalCallback(error, null)
        }
    }
}

function createChainRunner (chain, finalCallback, firstTime = true) {
    let isHavingChildren = 'chains' in chain && util.isArray(chain.chains)
    let asyncWorker = isHavingChildren && chain.mode === 'parallel' ? async.parallel : async.series
    return (callback) => {
        let actions = []
        if (VARIABLES._error) {
            // error encountered, stop the calculation
            return asyncWorker(actions, callback)
        }
        logMessage('Run chain #'+chain.id, VERBOSE)
        // checking chain.if condition (only for firstTime), because on the second time the action is triggered by `while` condition
        logMessage('(chain #' + chain.id + ') Checking `if` condition: ' + chain.if, VERY_VERBOSE)
        if (firstTime) {
            if (!evaluateStatement(chain.if)) {
                // `if` condition is wrong, stop here
                logMessage('(chain #' + chain.id + ') `if` condition rejected: ' + chain.if, VERY_VERBOSE)
                return asyncWorker(actions, callback)
            }
            logMessage('(chain #' + chain.id + ') `if` condition resolved: ' + chain.if, VERY_VERBOSE)
        } else {
            logMessage('(chain #' + chain.id + ') Performing operation again due to `while` condition', VERY_VERBOSE)
        }
        // at this point, chain.if condition resolved
        if ('chains' in chain && util.isArray(chain.chains)) {
            // this is a nested chain
            logMessage('(chain #' + chain.id + ') is nested', VERBOSE)
            let nestedChainActions = createNestedChainActions(chain, finalCallback)
            actions = actions.concat(nestedChainActions)
        } else if ('command' in chain) {
            // this is a single chain
            logMessage('(chain #' + chain.id + ') is single', VERBOSE)
            let singleCommandAction = createSingleChainAction(chain, finalCallback)
            actions.push(singleCommandAction)
        }
        // checking chain.while condition
        logMessage('(chain #' + chain.id + ') Checking `while` condition: ' + chain.while, VERY_VERBOSE)
        if (!evaluateStatement(chain.while)) {
            // `while` condition is wrong, stop here
            logMessage('(chain #' + chain.id + ') `while` condition rejected: ' + chain.while, VERY_VERBOSE)
            return asyncWorker(actions, callback)
        }
        logMessage('(chain #' + chain.id + ') `while` condition resolved: ' + chain.while, VERY_VERBOSE)
        // while condition is correct, now we need to do this again
        actions.push(createChainRunner(chain, finalCallback, false))
        return asyncWorker(actions, callback)
    }
}

function assignVariableByInsValue(chain, insValue) {
    // get ins and embed it into variables
    let ins = getInsNameAsArray(chain.ins)
    for (let i=0; i<ins.length; i++) {
        let key = ins[i]
        if (i < insValue.length) {
            try {
                VARIABLES[key] = safeEval(insValue[i])
            } catch (error) {
                VARIABLES[key] = insValue[i]
            }
        } else if (!(key in VARIABLES)) {
            VARIABLES[key] = null
        }
    }
}

function runRootChain (chain, insValue = [], vars = {}, finalCallback = null) {
    // get the root chain
    chain = preprocessor.getTrueRootChain(chain)
    // prepare variables
    VARIABLES = Object.assign(chain.vars, {$}, {'_ans': null,
        '_error': false,
        '_error_message': '',
        '_init_cwd': util.addTrailingSlash(process.cwd()),
        '_chain_cwd': util.addTrailingSlash(process.cwd()),
        '_description': ''}, vars)
    assignVariableByInsValue(chain, insValue)
    logMessage('CHAIN SEMANTIC:\n'+preprocessor.getInspectedObject(chain), VERBOSE)
    logMessage('INITIAL STATE:\n'+getPublishedState(), VERBOSE)
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
    let callback = decodedParameters['callback']
    fs.readFile(chain, (error, chainScript) => {
        if (error) {
            // file not exists
            chainScript = chain
            vars._description = 'SCRIPT: ' + util.sliceString(chainScript, 50)
        } else {
            // file exists
            let chainPath = path.resolve(chain)
            let dirName = path.dirname(chainPath)
            let baseName = path.basename(chainPath)
            vars._description = 'FILE: '+baseName
            vars._chain_cwd = util.addTrailingSlash(dirName)
            vars._init_cwd = util.addTrailingSlash(process.cwd())
        }
        // parse JSON/YAML
        util.parseJsonOrYaml(chainScript, function(error, chainObj){
            if (error) {
                return console.log(error)
            }
            runRootChain(chainObj, ins, vars, callback)
        })
    })
}

function logMessage(message, verbosity){
    if (verbosity > VARIABLES._verbose) {
        return null
    }
    let description = evaluateStatement('_description')
    let isoDate = (new Date()).toISOString()
    console.error('['+description+' '+isoDate+'] '+message)
}
