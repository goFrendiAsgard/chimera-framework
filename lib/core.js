'use strict'
require('cache-require-paths')

module.exports = {
  executeChain
}

// imports
const async = require('neo-async')
const fs = require('fs-extra')
const path = require('path')
const stringify = require('json-stringify-safe')
const safeEval = require('safe-eval')
const util = require('./util.js')
const preprocessor = require('./core-preprocessor.js')
const chimlParser = require('./core-chiml-parser.js')
const $ = require('./core-dollar.js')

// constants
const SILENT = 0
const VERBOSE = 1
const VERY_VERBOSE = 2
const ULTRA_VERBOSE = 3

const COLOR_FG_YELLOW = '\x1b[33m'
const COLOR_RESET = '\x1b[0m'

let CHIML_SCRIPT_MEMO = []

function executeChain (chain, ins, vars, callback) {
  let VARIABLES = {}
  let defaultIns = []
  let defaultVars = {}
  let chainPath = path.resolve(chain)
  let chainScript = chain
  if (util.isFunction(ins)) {
    callback = ins
    ins = defaultIns
    vars = defaultVars
  } else if (util.isFunction(vars)) {
    callback = vars
    vars = defaultVars
  } else {
    ins = util.isNullOrUndefined(ins) ? defaultIns : ins
    vars = util.isNullOrUndefined(vars) ? defaultVars : vars
  }
  callback = defineDefaultFinalCallback(callback)
  // is it javascript?
  if (chainPath.substr(chainPath.length - 3).toLowerCase() === '.js') {
    try {
      let jsChain = require(chainPath)
      let newVars = util.getPatchedObject({$}, vars)
      return jsChain(util.getDeepCopiedObject(ins), newVars, callback)
    } catch (error) {
      return callback(error, null)
    }
  }
  // is it recorded in CHIML_SCRIPT_MEMO? it must be a CHIML script
  if (CHIML_SCRIPT_MEMO.indexOf(chainScript) > -1) {
    vars._description = 'script: ' + util.getSlicedString(chainScript, 50)
    return executeChainScript(chainScript, ins, vars, callback)
  }
  // is it CHIML file?
  fs.stat(chainPath, (error, chainStat) => {
    if (error) {
      // no, it is not a CHIML file. it must be a CHIML script
      vars._description = 'script: ' + util.getSlicedString(chainScript, 50)
      CHIML_SCRIPT_MEMO.push(chainScript)
      return executeChainScript(chainScript, ins, vars, callback)
    }
    // chain is CHIML file
    let dirname = path.dirname(chainPath)
    let basename = path.basename(chainPath)
    let compiledChainPath = path.join(dirname, '._' + basename + '.cjson')
    vars._description = 'file: ' + basename
    vars._chain_cwd = dirname + '/'
    vars._init_cwd = process.cwd() + '/'
    return fs.stat(compiledChainPath, (error, compiledChainStat) => {
      let isCompilationFileValid = !error && chainStat.mtime < compiledChainStat.mtime
      if (isCompilationFileValid) {
        return fs.readFile(compiledChainPath, (error, compiledChainScript) => {
          if (error) {
            return compileAndExecuteFile(chainPath, compiledChainPath)
          }
          return executeChainScript(compiledChainScript, ins, vars, callback)
        })
      }
      return compileAndExecuteFile(chainPath, compiledChainPath)
    })
  })

  function compileAndExecuteFile (chainPath, compiledChainPath) {
    fs.readFile(chainPath, (error, chainScript) => {
      if (error) {
        return callback(error, null)
      }
      return chimlParser.parseChiml(chainScript, (error, chainObj) => {
        if (error) {
          return callback(error, null)
        }
        chainObj = preprocessor.getTrueRootChain(chainObj, false)
        chainObj._standard = true
        // compile
        util.writeJsonFile(compiledChainPath, chainObj, (error) => {
          if (error) {
            console.error(error)
          }
        })
        // and run at the same time
        return executeChainScript(chainScript, ins, vars, callback)
      })
    })
  }

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
        console.error(COLOR_FG_YELLOW)
        console.error(VARIABLES._error_object)
        console.error(COLOR_RESET)
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
        console.error(COLOR_FG_YELLOW)
        console.error(error)
        console.error(COLOR_RESET)
      } else {
        value = normalizeOutputValue(value)
        console.log(value)
      }
    }
  }

  function wrapFinalCallback (chain, finalCallback) {
    return (error) => {
      let result = evaluateStatement(chain.out)
      finalCallback(error, result)
    }
  }

  function evaluateObjectStatement (statement) {
    let result = {}
    for (let key in statement) {
      result[key] = evaluateStatement(statement[key])
    }
    return result
  }

  function evaluateArrayStatement (statement) {
    let result = []
    for (let element of statement) {
      result.push(evaluateStatement(element))
    }
    return result
  }

  function evaluateDottedVariable (statement) {
    let value = VARIABLES
    let valid = false
    if (statement.match(/^\w+(\.\w+)+$/g)) {
      let variableSegments = statement.split('.')
      for (let segment of variableSegments) {
        if (segment in value) {
          valid = true
          value = value[segment]
        } else {
          valid = false
          break
        }
      }
    }
    return {valid, value}
  }

  function evaluateStatement (statement, log = false) {
    if (util.isRealObject(statement)) {
      return evaluateObjectStatement(statement)
    }
    if (util.isArray(statement)) {
      return evaluateArrayStatement(statement)
    }
    if (util.isString(statement) && (statement === '' || statement[0] === '/')) {
      // empty string or started with /
      return statement
    }
    if (statement in VARIABLES) {
      // variable
      return VARIABLES[statement]
    }
    try {
      // literal
      return JSON.parse(statement)
    } catch (error) {
      if (util.isString(statement) && statement.match(/^[\w\s_]+$/g)) {
        // mere string but unquoted
        return statement
      }
      let arrayPatternMatch = util.isString(statement) && statement.match(/^\[([\w\s.,'"_]+)\]$/i)
      if (arrayPatternMatch) {
        // string representation of array
        let elementList = util.getSmartSplitted(arrayPatternMatch[1], ',')
        return evaluateArrayStatement(elementList)
      }
      try {
        let dottedVariableEvaluation = evaluateDottedVariable(statement)
        if (dottedVariableEvaluation.valid) {
          // dotted variable name
          return dottedVariableEvaluation.value
        }
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

  function createObjectProxy (object) {
    let handler = {
      get: function (target, prop, receiver) {
        if (typeof target[prop] === 'undefined' || target[prop] === null) {
          target[prop] = {}
        }
        if (util.isRealObject(target[prop])) {
          let rv = new Proxy(target[prop], handler)
          return rv
        }
        return target[prop]
      },
      set: function (obj, prop, value) {
        obj[prop] = value
        return Reflect.set(...arguments)
      }
    }
    return new Proxy(object, handler)
  }

  function getNormalizedValue (val) {
    try {
      return JSON.parse(val)
    } catch (error) {
      return val
    }
  }

  function setVariable (name, val) {
    let normalizedVal = getNormalizedValue(val)
    if (!util.isString(name)) {
      name = '_ans'
    }
    if (name in VARIABLES || (name.indexOf('.') === -1 && name.indexOf('[') === -1)) {
      VARIABLES[name] = normalizedVal
      return true
    } else if (name.indexOf('[') === -1) {
      let nameParts = name.split('.')
      let variable = VARIABLES
      for (let i = 0; i < nameParts.length; i++) {
        let namePart = nameParts[i]
        if (i === nameParts.length - 1) {
          variable[namePart] = val
          return true
        }
        if (util.isNullOrUndefined(variable[namePart])) {
          variable[namePart] = {}
        }
        variable = variable[namePart]
      }
    }
    VARIABLES.__proxy = createObjectProxy(VARIABLES)
    let scriptVal = stringify(normalizedVal)
    let script = '(() => {__proxy.' + name + ' = ' + scriptVal + '; delete this.__proxy; return this})()'
    safeEval(script, VARIABLES)
    for (let key in VARIABLES) {
      let value = VARIABLES[key]
      if (util.isString(value)) {
        try {
          VARIABLES[key] = JSON.parse(value)
        } catch (error) {
        }
      }
    }
    return true
  }

  function assignError (error, finalCallback) {
    VARIABLES._error = true
    VARIABLES._error_message = error.message
    VARIABLES._error_object = error
    return finalCallback(error, null)
  }

  function createSingleChainCallback (chain, next, finalCallback) {
    return (error, result) => {
      if (error) {
        return assignError(error, finalCallback)
      }
      try {
        setVariable(chain.out, result)
        logMessage('(chain #' + chain.id + ') Set ' + chain.out + ' into: ' + util.getInspectedObject(evaluateStatement(chain.out)), VERY_VERBOSE)
        logMessage('(chain #' + chain.id + ') state after execution:\n' + getPublishedState(), ULTRA_VERBOSE)
        return next()
      } catch (setVariableError) {
        return assignError(setVariableError, finalCallback)
      }
    }
  }

  function createSingleChainAction (chain, finalCallback) {
    return (next) => {
      let inputStatement, inputs
      try {
        if (util.isString(chain.ins)) {
          inputStatement = '[' + chain.ins + ']'
        } else {
          inputStatement = chain.ins
        }
        inputs = evaluateStatement(inputStatement)
        // if inputs is undefined, turn it into empty array
        if (inputs === undefined) {
          inputs = []
        }
        // inputs should be array
        if (!util.isArray(inputs)) {
          inputs = [inputs]
        }
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
        return chain.compiledCommand(...inputs)
      } catch (error) {
        let inputValues = util.isArray(inputs) ? inputs.slice(1) : []
        let errorLog = 'ERROR ON CHAIN #' + chain.id + '\n'
        errorLog += 'INPUT: ' + util.getInspectedObject(chain.ins) + '\n'
        errorLog += 'INPUT VALUES: ' + util.getInspectedObject(inputValues) + '\n'
        errorLog += 'COMMAND: ' + util.getInspectedObject(chain.command) + '\n'
        logMessage(errorLog, SILENT)
        return assignError(error, finalCallback)
      }
    }
  }

  function createChainRunner (chain, finalCallback, firstTime = true) {
    let isHavingChildren = 'chains' in chain && util.isArray(chain.chains)
    let asyncWorker = isHavingChildren && chain.mode === 'parallel' ? async.parallel : async.series
    return (callback) => {
      let actions = []
      if (VARIABLES._error) {
        return asyncWorker(actions, callback)
      }
      logMessage('Run chain #' + chain.id, VERBOSE)
      logMessage('(chain #' + chain.id + ') Checking `if` condition: ' + chain.branch, VERY_VERBOSE)
      if (firstTime) {
        if (!evaluateStatement(chain.branch)) {
          logMessage('(chain #' + chain.id + ') `if` condition rejected: ' + chain.branch, VERY_VERBOSE)
          return asyncWorker(actions, callback)
        }
        logMessage('(chain #' + chain.id + ') `if` condition resolved: ' + chain.branch, VERY_VERBOSE)
      } else {
        logMessage('(chain #' + chain.id + ') Performing operation again due to `while` condition', VERY_VERBOSE)
      }
      if ('chains' in chain && util.isArray(chain.chains)) {
        logMessage('(chain #' + chain.id + ') is nested', VERBOSE)
        let nestedChainActions = createNestedChainActions(chain, finalCallback)
        actions = actions.concat(nestedChainActions)
      } else if ('command' in chain) {
        logMessage('(chain #' + chain.id + ') is single', VERBOSE)
        let singleCommandAction = createSingleChainAction(chain, finalCallback)
        actions.push(singleCommandAction)
      }
      actions.push((next) => {
        logMessage('(chain #' + chain.id + ') Checking `while` condition: ' + chain.loop, VERY_VERBOSE)
        if (!evaluateStatement(chain.loop)) {
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
          VARIABLES[key] = evaluateStatement(insValue[i])
        } catch (error) {
          VARIABLES[key] = insValue[i]
        }
      } else if (!(key in VARIABLES)) {
        VARIABLES[key] = null
      }
    }
  }

  function runRootChain (chain, insValue, vars, finalCallback) {
    // get the root chain
    let isStandard = util.isRealObject(chain) && chain._standard === true
    chain = preprocessor.getTrueRootChain(chain, isStandard)
    // prepare variables
    VARIABLES = Object.assign(chain.vars, {$}, {'_ans': null,
      '_error': false,
      '_error_message': '',
      '_error_object': null,
      '_init_cwd': process.cwd() + '/',
      '_chain_cwd': process.cwd() + '/',
      '_description': ''})
    // patch variables
    VARIABLES = util.getPatchedObject(VARIABLES, vars)
    // add ins to variables
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

  function executeChainScript (chainScript, ins, vars, callback) {
    chimlParser.parseChiml(chainScript, (error, chainObj) => {
      if (error) {
        console.error(COLOR_FG_YELLOW)
        console.error('CHIML Script: \n' + chainScript)
        console.error(error)
        console.error(COLOR_RESET)
        callback(error, null)
      } else {
        runRootChain(chainObj, util.getDeepCopiedObject(ins), vars, callback)
      }
    })
  }

  function logMessage (message, verbosity) {
    if (verbosity > VARIABLES._verbose) {
      return null
    }
    let description = evaluateStatement('_description')
    let isoDate = (new Date()).toISOString()
    return console.error(COLOR_FG_YELLOW + '[' + description + ' ' + isoDate + '] ' + message + COLOR_RESET)
  }
}
