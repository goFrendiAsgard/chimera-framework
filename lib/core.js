'use strict'

module.exports = {
  executeChain
}

// imports
const requireOnce = require('./require-once.js')

let preprocessor, chimlParser, safeEval, stringify, nsync, fs, util, path, $

// constants
const SILENT = 0
const VERBOSE = 1
const VERY_VERBOSE = 2
const ULTRA_VERBOSE = 3

const COLOR_FG_YELLOW = '\x1b[33m'
const COLOR_FG_RED = '\x1b[31m'
const COLOR_RESET = '\x1b[0m'
const MERE_UNQUOTED_STRING_PATTERN = /^[\w\s_]+$/g
const ARRAY_PATTERN = /^\[([\w\s.,'"_]+)\]$/i
const DOTTED_VARIABLE_PATTERN = /^\w+(\.\w+)+$/g

let OBJ_CACHE = {}
let JS_CACHE = {}
let ENV_CACHE = {}

function executeChain (chain, ins, vars, callback) {
  path = requireOnce('path')
  util = requireOnce('./util.js')
  $ = requireOnce('./core-dollar.js')
  let VARIABLES = {}
  let defaultIns = []
  let defaultVars = {}
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
  vars._init_cwd = process.cwd() + '/'
  // chain is in OBJ_CACHE
  if (chain in OBJ_CACHE) {
    vars = util.getPatchedObject(vars, ENV_CACHE[chain])
    const chainObj = OBJ_CACHE[chain]
    return runRootChain(chainObj, util.getDeepCopiedObject(ins), vars, callback)
  }
  // chain is in JS_CACHE
  if (chain in JS_CACHE) {
    vars = util.getPatchedObject(vars, ENV_CACHE[chain])
    const jsChain = JS_CACHE[chain]
    return executeJsChain(jsChain, ins, vars, callback)
  }
  // chain is an object, run it
  if (util.isRealObject(chain)) {
    return runRootChain(chain, util.getDeepCopiedObject(ins), vars, callback)
  }
  // chain is not an object, it might be a script or a file
  const chainPath = path.resolve(chain)
  chimlParser = requireOnce('./core-chiml-parser.js')
  return chimlParser.parseChiml(chain, (error, chainObj) => {
    if (!error && chain !== chainObj) {
      // no doubt, it must be CHIML script
      ENV_CACHE[chain] = {}
      OBJ_CACHE[chain] = chainObj
      return runRootChain(chainObj, util.getDeepCopiedObject(ins), vars, callback)
    }
    // is it a file?
    fs = requireOnce('fs')
    return fs.readFile(chainPath, (error, chainScript) => {
      if (error) {
        // no, it is not a file. it probably a CHIML script
        chainScript = chain
        vars._description = 'script: ' + util.getSlicedString(chainScript, 50)
        return executeChainScript(chainScript, ins, vars, callback)
      }
      // it must be a file
      const dirname = path.dirname(chainPath)
      const basename = path.basename(chainPath)
      vars._description = 'file: ' + basename
      vars._chain_cwd = dirname + '/'
      // is it a javascript module?
      if (chainPath.substr(chainPath.length - 3).toLowerCase() === '.js') {
        try {
          const jsChain = require(chainPath)
          JS_CACHE[chain] = jsChain
          ENV_CACHE[chain] = {_description: vars._description, _chain_cwd: vars._chain_cwd}
          return executeJsChain(jsChain, ins, vars, callback)
        } catch (error) {
          return callback(error, null)
        }
      }
      // chain is CHIML file
      return executeChainScript(chainScript, ins, vars, callback)
    })
  })

  function executeJsChain (jsChain, ins, vars, callback) {
    const newVars = util.getPatchedObject({$}, vars)
    injectSpecialProperties(newVars)
    return jsChain(util.getDeepCopiedObject(ins), newVars, callback)
  }

  function getPublishedState () {
    const filteredState = util.getFilteredObject(VARIABLES, ['$'])
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
      stringify = requireOnce('json-stringify-safe')
      result = stringify(result)
    }
    return result
  }

  function showCurrentError () {
    if (VARIABLES._error) {
      logMessage('Chain Error : ' + VARIABLES._error_message)
      if ('_error_object' in VARIABLES && util.isRealObject(VARIABLES._error_object)) {
        console.error(COLOR_FG_RED)
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
        console.error(COLOR_FG_RED)
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
      const result = evaluateStatement(chain.out)
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
    if (statement.match(DOTTED_VARIABLE_PATTERN)) {
      const variableSegments = statement.split('.')
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
      if (util.isString(statement) && statement.match(MERE_UNQUOTED_STRING_PATTERN)) {
        // mere string but unquoted
        return statement
      }
      const arrayPatternMatch = util.isString(statement) && statement.match(ARRAY_PATTERN)
      if (arrayPatternMatch) {
        // string representation of array
        const elementList = util.getSmartSplitted(arrayPatternMatch[1], ',')
        return evaluateArrayStatement(elementList)
      }
      try {
        const dottedVariableEvaluation = evaluateDottedVariable(statement)
        if (dottedVariableEvaluation.valid) {
          // dotted variable name
          return dottedVariableEvaluation.value
        }
        // script
        safeEval = requireOnce('./safe-eval.js')
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
        const chainRunner = createChainRunner(subChain, finalCallback)
        chainRunner(next)
      })
    }
    return actions
  }

  function createObjectProxy (object) {
    const handler = {
      get: function (target, prop, receiver) {
        if (typeof target[prop] === 'undefined' || target[prop] === null) {
          target[prop] = {}
        }
        if (util.isRealObject(target[prop])) {
          const rv = new Proxy(target[prop], handler)
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
    const normalizedVal = getNormalizedValue(val)
    if (!util.isString(name)) {
      name = '_ans'
    }
    if (name in VARIABLES || (name.indexOf('.') === -1 && name.indexOf('[') === -1)) {
      VARIABLES[name] = normalizedVal
      return true
    } else if (name.indexOf('[') === -1) {
      const nameParts = name.split('.')
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
    stringify = requireOnce('json-stringify-safe')
    const scriptVal = stringify(normalizedVal)
    const script = '(() => {__proxy.' + name + ' = ' + scriptVal + '; delete this.__proxy; return this})()'
    safeEval = requireOnce('./safe-eval.js')
    safeEval(script, VARIABLES)
    for (let key in VARIABLES) {
      const value = VARIABLES[key]
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
        const commandCallback = createSingleChainCallback(chain, next, finalCallback)
        // add command callback as the last input
        inputs.push(commandCallback)
        // run the command, and continue to the next chain
        return chain.compiledCommand(...inputs)
      } catch (error) {
        const inputValues = util.isArray(inputs) ? inputs.slice(1) : []
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
    nsync = requireOnce('neo-async')
    const isHavingChildren = 'chains' in chain && util.isArray(chain.chains)
    const asyncWorker = isHavingChildren && chain.mode === 'parallel' ? nsync.parallel : nsync.series
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
        const nestedChainActions = createNestedChainActions(chain, finalCallback)
        actions = actions.concat(nestedChainActions)
      } else if ('command' in chain) {
        logMessage('(chain #' + chain.id + ') is single', VERBOSE)
        const singleCommandAction = createSingleChainAction(chain, finalCallback)
        actions.push(singleCommandAction)
      }
      actions.push((next) => {
        logMessage('(chain #' + chain.id + ') Checking `while` condition: ' + chain.loop, VERY_VERBOSE)
        if (!evaluateStatement(chain.loop)) {
          logMessage('(chain #' + chain.id + ') `while` condition rejected: ' + chain.loop, VERY_VERBOSE)
          next()
        } else {
          logMessage('(chain #' + chain.id + ') `while` condition resolved: ' + chain.loop, VERY_VERBOSE)
          const loopChainRunner = createChainRunner(chain, finalCallback, false)
          loopChainRunner(next)
        }
      })
      return asyncWorker(actions, callback)
    }
  }

  function assignVariableByInsValue (chain, insValue) {
    // get ins and embed it into variables
    const ins = getInsNameAsArray(chain.ins)
    for (let i = 0; i < ins.length; i++) {
      const key = ins[i]
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
    nsync = requireOnce('neo-async')
    // get the root chain
    preprocessor = require('./core-preprocessor.js')
    chain = preprocessor.getTrueRootChain(chain)
    // prepare variables
    VARIABLES = Object.assign(chain.vars, {$}, {'_ans': null,
      '_error': false,
      '_error_message': '',
      '_error_object': null,
      '_init_cwd': process.cwd() + '/',
      '_chain_cwd': process.cwd() + '/',
      '_description': ''
    })
    // patch variables
    VARIABLES = util.getPatchedObject(VARIABLES, vars)
    injectSpecialProperties(VARIABLES)
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
    const chainRunner = createChainRunner(chain, finalCallback, true)
    nsync.series([chainRunner], finalCallback)
  }

  function injectSpecialProperties (variables) {
    Object.defineProperty(variables, '_vars', {
      get: () => {
        return variables
      }
    })
    variables._runChain = (chain, ...args) => {
      const callback = args.pop()
      // only dollar should be passed to the sub-chain
      const dollar = {}
      if (util.isRealObject(variables.$)) {
        for (let key in variables.$) {
          // these are aliases that will be overridden by the sub-chain, no need to send it
          if (key === 'runChain' || key === 'map' || key === 'filter') {
            continue
          }
          dollar[key] = variables.$[key]
        }
      }
      const sentVariables = {$: dollar}
      executeChain(chain, args, sentVariables, callback)
    }
    variables._map = wrappedMap
    variables._filter = wrappedFilter
    // create aliases for backward compatibility
    variables.$.runChain = variables._runChain
    variables.$.map = variables._map
    variables.$.filter = variables._filter
  }

  function wrappedMap (list, chain, callback) {
    map(list, chain, getStrippedVariables(), callback)
  }

  function wrappedFilter (list, chain, callback) {
    filter(list, chain, getStrippedVariables(), callback)
  }

  function getStrippedVariables () {
    let strippedVars = {}
    for (let key in VARIABLES) {
      if (key.indexOf('_') === 0) {
        continue
      }
      strippedVars[key] = VARIABLES[key]
    }
    return strippedVars
  }

  function executeChainScript (chainScript, ins, vars, callback) {
    chimlParser = requireOnce('./core-chiml-parser.js')
    chimlParser.parseChiml(chainScript, (error, chainObj) => {
      if (error) {
        console.error(COLOR_FG_YELLOW)
        console.error('CHIML Script: \n' + chainScript)
        console.error(COLOR_FG_RED)
        console.error(error)
        console.error(COLOR_RESET)
        callback(error, null)
      } else {
        ENV_CACHE[chain] = {}
        for (let key of ['_description', '_chain_cwd']) {
          if (key in vars) {
            ENV_CACHE[chain][key] = vars[key]
          }
        }
        OBJ_CACHE[chain] = chainObj
        runRootChain(chainObj, util.getDeepCopiedObject(ins), vars, callback)
      }
    })
  }

  function logMessage (message, verbosity) {
    if (verbosity > VARIABLES._verbose) {
      return null
    }
    const description = evaluateStatement('_description')
    const isoDate = (new Date()).toISOString()
    return console.error(COLOR_FG_YELLOW + '[' + description + ' ' + isoDate + '] ' + message + COLOR_RESET)
  }
}

function map (list, chain, variables, callback) {
  nsync = requireOnce('neo-async')
  stringify = requireOnce('json-stringify-safe')
  let actions = []
  for (let element of list) {
    actions.push((next) => {
      executeChain(chain, [element], variables, (error, result) => {
        next(error, result)
      })
    })
  }
  nsync.parallel(actions, (error, results) => {
    callback(error, results)
  })
}

function filter (list, chain, variables, callback) {
  nsync = requireOnce('neo-async')
  stringify = requireOnce('json-stringify-safe')
  let actions = []
  for (let element of list) {
    actions.push((next) => {
      executeChain(chain, [element], variables, (error, result) => {
        next(error, result)
      })
    })
  }
  nsync.parallel(actions, (error, results) => {
    let newList = []
    for (let i = 0; i < list.length; i++) {
      if (results[i]) {
        newList.push(list[i])
      }
    }
    callback(error, newList)
  })
}
