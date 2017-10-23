#! /usr/bin/env node
'use strict'

module.exports = {
  executeChain
}

// imports
const async = require('neo-async')
const fs = require('fs')
const stringify = require('json-stringify-safe')
const path = require('path')
const safeEval = require('safe-eval')
const util = require('./util.js')
const preprocessor = require('./core-preprocessor.js')
const chimlParser = require('./core-chiml-parser.js')
const $ = require('./core-dollar.js')

// constants
const VERBOSE = 1
const VERY_VERBOSE = 2
const ULTRA_VERBOSE = 3

const COLOR_FG_YELLOW = '\x1b[33m'
const COLOR_RESET = '\x1b[0m'

function executeChain (chain, ins = [], vars = {}, callback = null) {
  let VARIABLES = {}

  fs.readFile(chain, (error, chainScript) => {
    if (error) {
      // file not exists
      chainScript = chain
      vars._description = 'SCRIPT: ' + util.getSlicedString(chainScript, 50)
    } else {
      // file exists
      let chainPath = path.resolve(chain)
      let dirName = path.dirname(chainPath)
      let baseName = path.basename(chainPath)
      vars._description = 'FILE: ' + baseName
      vars._chain_cwd = dirName + '/'
      vars._init_cwd = process.cwd() + '/'
    }
    // parse JSON/CHIML
    executeChainScript(chainScript, ins, vars, callback)
  })

  function getPublishedState () {
    let filteredState = util.getFilteredObject(VARIABLES, ['$'])
    return util.getInspectedObject(filteredState)
  }

  function getInsNameAsArray (ins) {
    if (util.isString(ins)) {
      return util.getSmartSplitted(ins, ',')
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
        console.error(COLOR_FG_YELLOW + VARIABLES._error_object + COLOR_RESET)
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
        console.error(COLOR_FG_YELLOW + error + COLOR_RESET)
      } else {
        value = normalizeOutputValue(value)
        console.log(value)
      }
    }
  }

  function wrapFinalCallback (chain, finalCallback) {
    return (error, allValues) => {
      finalCallback = defineDefaultFinalCallback(finalCallback)
      let result = evaluateStatement(chain.out)
      finalCallback(error, result)
    }
  }

  function evaluateStatement (statement, log = false) {
    try {
      // literal
      return JSON.parse(statement)
    } catch (error) {
      if (statement in VARIABLES) { 
        // variable
        return VARIABLES[statement]
      }
      let arrayPatternMatch = statement.match(/^\[([\w\s.,'"_]+)\]$/i)
      if (arrayPatternMatch) {
        // string containing array
        let result = []
        let elementList = util.getSmartSplitted(arrayPatternMatch[1], ',')
        for (let element of elementList) {
          result.push(evaluateStatement(element, log))
        }
        return result
      }
      try {
        // script 
        return safeEval(statement, VARIABLES)
      } catch (error) {
        if (log) {
          logMessage(error, VERBOSE)
        }
        return statement
      }
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
      newName = name.replace(/\[[^[\]]+\]/g, (element) => {
        let value = util.getUnwrapped(element)
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
    name = getVariableTrueName(name)
    let variable = VARIABLES
    let nameParts = name.split('.')
    for (let i = 0; i < nameParts.length; i++) {
      let namePart = nameParts[i]
      if (i === nameParts.length - 1) {
        variable[namePart] = value
        return value
      } else if (util.isNullOrUndefined(variable[namePart])) {
        variable[namePart] = {}
      }
      variable = variable[namePart]
    }
  }

  function createSingleChainCallback (chain, next, finalCallback) {
    return (error, result) => {
      if (error) {
        VARIABLES._error = true
        VARIABLES._error_message = error.message
        VARIABLES._error_object = error
        return finalCallback(error, null)
      }
      try {
        setVariable(chain.out, result)
        logMessage('(chain #' + chain.id + ') Set ' + chain.out + ' into: ' + util.getInspectedObject(evaluateStatement(chain.out)), VERY_VERBOSE)
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

  function getEvaluatedStructure (structure) {
    let newStructure
    if (util.isRealObject(structure)) {
      newStructure = {}
      for (let key in structure) {
        newStructure[key] = getEvaluatedStructure(structure[key])
      }
    } else if (util.isArray(structure)) {
      newStructure = []
      for (let element of structure) {
        newStructure.push(getEvaluatedStructure(element))
      }
    } else {
      newStructure = evaluateStatement(structure)
    }
    return newStructure
  }

  function createSingleChainAction (chain, finalCallback) {
    return (next) => {
      try {
        let inputStatement
        if (util.isString(chain.ins)) {
          inputStatement = '[' + chain.ins + ']'
        } else {
          inputStatement = chain.ins
        }
        let inputs = getEvaluatedStructure(inputStatement)
        if (VARIABLES._error) {
          return finalCallback(VARIABLES._error_object, null)
        }
        logMessage('(chain #' + chain.id + ') input values: ' + util.getInspectedObject(inputs), VERBOSE)
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
      logMessage('Run chain #' + chain.id, VERBOSE)
      // checking chain.branch condition (only for firstTime), because on the second time the action is triggered by `while` condition
      logMessage('(chain #' + chain.id + ') Checking `if` condition: ' + chain.branch, VERY_VERBOSE)
      if (firstTime) {
        if (!evaluateStatement(chain.branch)) {
          // `if` condition is wrong, stop here
          logMessage('(chain #' + chain.id + ') `if` condition rejected: ' + chain.branch, VERY_VERBOSE)
          return asyncWorker(actions, callback)
        }
        logMessage('(chain #' + chain.id + ') `if` condition resolved: ' + chain.branch, VERY_VERBOSE)
      } else {
        logMessage('(chain #' + chain.id + ') Performing operation again due to `while` condition', VERY_VERBOSE)
      }
      // at this point, chain.branch condition resolved
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
      // add `loop` trigger
      actions.push((next) => {
        logMessage('(chain #' + chain.id + ') Checking `while` condition: ' + chain.loop, VERY_VERBOSE)
        if (!evaluateStatement(chain.loop)) {
          // `while` condition is wrong, stop here
          logMessage('(chain #' + chain.id + ') `while` condition rejected: ' + chain.loop, VERY_VERBOSE)
          next()
        } else {
          logMessage('(chain #' + chain.id + ') `while` condition resolved: ' + chain.loop, VERY_VERBOSE)
          let loopChainRunner = createChainRunner(chain, finalCallback, false)
          loopChainRunner(next)
        }
      })
      return asyncWorker(actions, callback)
    }
  }

  function assignVariableByInsValue (chain, insValue) {
    // get ins and embed it into variables
    let ins = getInsNameAsArray(chain.ins)
    for (let i = 0; i < ins.length; i++) {
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
      '_error_object': null,
      '_init_cwd': process.cwd() + '/',
      '_chain_cwd': process.cwd() + '/',
      '_description': ''}, vars)
    assignVariableByInsValue(chain, insValue)
    logMessage('CHAIN SEMANTIC:\n' + util.getInspectedObject(chain), VERBOSE)
    logMessage('INITIAL STATE:\n' + getPublishedState(), VERBOSE)
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

  function executeChainScript (chainScript, ins = [], vars = {}, callback = null) {
    chimlParser.parseChiml(chainScript, (error, chainObj) => {
      if (error) {
        console.error(COLOR_FG_YELLOW)
        console.error('CHIML Script: \n' + chainScript)
        console.error(error)
        console.error(COLOR_RESET)
      } else {
        runRootChain(chainObj, ins, vars, callback)
      }
    })
  }

  function logMessage (message, verbosity) {
    if (verbosity > VARIABLES._verbose) {
      return null
    }
    let description = evaluateStatement('_description')
    let isoDate = (new Date()).toISOString()
    console.error(COLOR_FG_YELLOW + description + ' ' + isoDate + '] ' + message + COLOR_RESET)
  }
}
