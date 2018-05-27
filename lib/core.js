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
const MERE_UNQUOTED_STRING_PATTERN = /^[\w\s_:]+$/g
const ARRAY_PATTERN = /^\[([\w\s.,'"_]+)\]$/i
const DOTTED_VARIABLE_PATTERN = /^\w+(\.\w+)+$/g
const VALID_URL = /^([a-z]+):\/\/[^\s/$.?#].[^\s]*$/g

let OBJ_CACHE = {}
let JS_CACHE = {}
let ENV_CACHE = {}

function executeChain (chain, ins, vars, callback) {
  path = requireOnce('path')
  util = requireOnce('./util.js')
  $ = requireOnce('./core-dollar.js')
  let VARIABLES_PROXY
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
  // chain is an object, run it
  if (util.isRealObject(chain)) {
    return runRootChain(chain, ins, vars, callback)
  }
  // chain is in OBJ_CACHE
  if (chain in OBJ_CACHE) {
    vars = util.getPatchedObject(vars, ENV_CACHE[chain], false)
    const chainObj = OBJ_CACHE[chain]
    return runRootChain(chainObj, ins, vars, callback)
  }
  // chain is in JS_CACHE
  if (chain in JS_CACHE) {
    vars = util.getPatchedObject(vars, ENV_CACHE[chain], false)
    const jsChain = JS_CACHE[chain]
    return executeJsChain(jsChain, ins, vars, callback)
  }
  // chain is not an object, it might be a script or a file
  const chainPath = path.resolve(chain)
  chimlParser = requireOnce('./core-chiml-parser.js')
  return chimlParser.parseChiml(chain, (error, chainObj) => {
    if (!error && chain !== chainObj) {
      // no doubt, it must be CHIML script
      ENV_CACHE[chain] = {}
      OBJ_CACHE[chain] = chainObj
      return runRootChain(chainObj, ins, vars, callback)
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
          return setImmediate(() => { callback(error, null) })
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

  function defineDefaultFinalCallback (finalCallback) {
    return (error, value) => {
      if (VARIABLES._error) {
        if ('_error_object' in VARIABLES && util.isRealObject(VARIABLES._error_object)) {
          return finalCallback(VARIABLES._error_object, value)
        }
        return finalCallback(VARIABLES._error_message, value)
      }
      return finalCallback(error, value)
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
    const keys = Object.keys(statement)
    for (let i = 0; i < keys.length; i++) {
      if (keys[i] === '$' || keys[i].indexOf('_') === 0) {
        result[keys[i]] = statement[keys[i]]
      } else {
        result[keys[i]] = evaluateStatement(statement[keys[i]])
      }
    }
    return result
  }

  function evaluateArrayStatement (statement) {
    return statement.map((element) => {
      return evaluateStatement(element)
    })
  }

  function evaluateDottedVariable (statement) {
    let value = VARIABLES
    let isValid = false
    let isMatch = false
    if (statement.match(DOTTED_VARIABLE_PATTERN)) {
      isMatch = true
      const variableSegments = statement.split('.')
      for (let i = 0; i < variableSegments.length; i++) {
        const segment = variableSegments[i]
        if (segment in value) {
          isValid = true
          value = value[segment]
        } else {
          isValid = false
          break
        }
      }
    }
    return {isValid, isMatch, value}
  }

  function evaluateStatement (statement, log = false) {
    if (util.isRealObject(statement)) {
      return evaluateObjectStatement(statement)
    }
    if (util.isArray(statement)) {
      return evaluateArrayStatement(statement)
    }
    if (util.isString(statement)) {
      if (statement === 'true') {
        // boolean true
        return true
      }
      if (statement === 'false') {
        // boolean false
        return false
      }
      if (statement === 'null') {
        // null
        return null
      }
      if (statement in VARIABLES) {
        // variable
        return VARIABLES[statement]
      }
      if (statement === '' || statement[0] === '/' ||
        statement.indexOf('file: ') === 0 || statement.indexOf('script: ') === 0 ||
        statement.indexOf('C:\\\\') === 0 || statement.indexOf('D:\\\\') === 0 ||
        statement.indexOf('E:\\\\') === 0 || statement.indexOf('F:\\\\') === 0 ||
        statement.indexOf('H:\\\\') === 0 || statement.indexOf('I:\\\\') === 0 ||
        statement.match(VALID_URL) || statement.match(MERE_UNQUOTED_STRING_PATTERN)) {
        return statement
      }
      const normalizedValue = getNormalizedValue(statement)
      if (normalizedValue !== statement) {
        return normalizedValue
      }
      const arrayPatternMatch = statement.match(ARRAY_PATTERN)
      if (arrayPatternMatch) {
        // string representation of array
        const elementList = util.getSmartSplitted(arrayPatternMatch[1], ',')
        return evaluateArrayStatement(elementList)
      }
      const dottedVariableEvaluation = evaluateDottedVariable(statement)
      if (dottedVariableEvaluation.isValid) {
        // dotted variable name
        return dottedVariableEvaluation.value
      } else if (dottedVariableEvaluation.isMatch) {
        // match dottedVariable but not a variable
        return statement
      }
      // script
      safeEval = requireOnce('./safe-eval.js')
      return safeEval(statement, VARIABLES)
    }
    return statement
  }

  function createNestedChainActions (chain, finalCallback) {
    const actions = chain.chains.map((subChain) => {
      return (next) => {
        const chainRunner = createChainRunner(subChain, finalCallback)
        chainRunner(next)
      }
    })
    return actions
  }

  function createObjectProxy (object) {
    const handler = {
      get: function (target, prop, receiver) {
        if (util.isNullOrUndefined(target[prop])) {
          target[prop] = {}
        }
        if (util.isRealObject(target[prop])) {
          const rv = new Proxy(target[prop], handler)
          return rv
        }
        return target[prop]
      },
      set: function (obj, prop, value) {
        if (util.isString(value)) {
          value = getNormalizedValue(value)
        }
        obj[prop] = value
        return Reflect.set(...arguments)
      }
    }
    return new Proxy(object, handler)
  }

  function getNormalizedValue (val) {
    if (!util.isString(val)) {
      return val
    }
    return util.getParsedJson(val)
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
    stringify = requireOnce('json-stringify-safe')
    const scriptVal = stringify(normalizedVal)
    const script = '(() => {_vars.' + name + ' = ' + scriptVal + '; return _vars})()'
    safeEval = requireOnce('./safe-eval.js')
    safeEval(script, VARIABLES)
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
        if (VERY_VERBOSE < VARIABLES._verbose) {
          logMessage('(chain #' + chain.id + ') Set ' + chain.out + ' into: ' + util.getInspectedObject(evaluateStatement(chain.out)))
        }
        if (ULTRA_VERBOSE < VARIABLES._verbose) {
          logMessage('(chain #' + chain.id + ') state after execution:\n' + getPublishedState())
        }
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
        // assemble inputStatement
        if (util.isString(chain.ins)) {
          inputStatement = '[' + chain.ins + ']'
        } else {
          inputStatement = chain.ins
        }
        if ((chain.command === '[_map]' || chain.command === '[_filter]') && chain.ins.length === 2) {
          inputs = [evaluateStatement(chain.ins[0]), chain.ins[1]]
        } else if (chain.command === '[_chain]' && chain.ins.length > 0) {
          let newInputs = [inputs[0]]
          for (let i = 0; i < inputs.length; i++) {
            newInputs.push(evaluateStatement(chain.ins[i]))
          }
          inputs = newInputs
        } else {
          inputs = evaluateStatement(inputStatement)
        }
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
        if (VERBOSE < VARIABLES._verbose) {
          logMessage('(chain #' + chain.id + ') input values: ' + util.getInspectedObject(inputs))
        }
        // add VARIABLES as the first input (context)
        inputs.unshift(VARIABLES)
        // prepare command callback
        const commandCallback = createSingleChainCallback(chain, next, finalCallback)
        // add command callback as the last input
        inputs.push(commandCallback)
        // run the command, and continue to the next chain
        return chain.compiledCommand(...inputs)
      } catch (error) {
        if (SILENT < VARIABLES._verbose) {
          const inputValues = util.isArray(inputs) ? inputs.slice(1) : []
          let errorLog = 'ERROR ON CHAIN #' + chain.id + '\n'
          errorLog += 'INPUT: ' + util.getInspectedObject(chain.ins) + '\n'
          errorLog += 'INPUT VALUES: ' + util.getInspectedObject(inputValues) + '\n'
          errorLog += 'COMMAND: ' + util.getInspectedObject(chain.command) + '\n'
          logMessage(errorLog)
        }
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
      if (VERBOSE < VARIABLES._verbose) {
        logMessage('Run chain #' + chain.id)
        if (VERY_VERBOSE < VARIABLES._verbose) {
          logMessage('(chain #' + chain.id + ') Checking `if` condition: ' + chain.branch)
        }
      }
      if (firstTime) {
        if (!evaluateStatement(chain.branch)) {
          if (VERY_VERBOSE < VARIABLES._verbose) {
            logMessage('(chain #' + chain.id + ') `if` condition rejected: ' + chain.branch)
          }
          return asyncWorker(actions, callback)
        }
        if (VERY_VERBOSE < VARIABLES._verbose) {
          logMessage('(chain #' + chain.id + ') `if` condition resolved: ' + chain.branch)
        }
      } else if (VERY_VERBOSE < VARIABLES._verbose) {
        logMessage('(chain #' + chain.id + ') Performing operation again due to `while` condition')
      }
      if ('chains' in chain && util.isArray(chain.chains)) {
        if (VERBOSE < VARIABLES._verbose) {
          logMessage('(chain #' + chain.id + ') is nested')
        }
        const nestedChainActions = createNestedChainActions(chain, finalCallback)
        actions = actions.concat(nestedChainActions)
      } else if ('command' in chain) {
        if (VERBOSE < VARIABLES._verbose) {
          logMessage('(chain #' + chain.id + ') is single')
        }
        const singleCommandAction = createSingleChainAction(chain, finalCallback)
        actions.push(singleCommandAction)
      }
      actions.push((next) => {
        if (VERY_VERBOSE < VARIABLES._verbose) {
          logMessage('(chain #' + chain.id + ') Checking `while` condition: ' + chain.loop)
        }
        if (!evaluateStatement(chain.loop)) {
          if (VERY_VERBOSE < VARIABLES._verbose) {
            logMessage('(chain #' + chain.id + ') `while` condition rejected: ' + chain.loop)
          }
          next()
        } else {
          if (VERY_VERBOSE < VARIABLES._verbose) {
            logMessage('(chain #' + chain.id + ') `while` condition resolved: ' + chain.loop)
          }
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
    preprocessor = require('./core-preprocessor.js')
    // get the root chain
    chain = preprocessor.getTrueRootChain(chain)
    const processCwd = process.cwd() + '/'
    // prepare variables
    VARIABLES = Object.assign(chain.vars, {$}, {_ans: null,
      _error: false,
      _error_message: '',
      _error_object: null,
      _init_cwd: processCwd,
      _chain_cwd: processCwd,
      _description: ''
    })
    // patch variables
    VARIABLES = util.getPatchedObject(VARIABLES, vars, false)
    injectSpecialProperties(VARIABLES)
    // add ins to variables
    assignVariableByInsValue(chain, insValue)
    if (VERBOSE < VARIABLES._verbose) {
      logMessage('CHAIN SEMANTIC:\n' + util.getInspectedObject(chain))
      logMessage('INITIAL STATE:\n' + getPublishedState())
    }
    // get `out` and embed it into variables
    if (!(chain.out in VARIABLES)) {
      VARIABLES[chain.out] = null
    }
    // prepare final callback
    finalCallback = wrapFinalCallback(chain, finalCallback)
    // create chain runner and run it
    const chainRunner = createChainRunner(chain, finalCallback, true)
    chainRunner(finalCallback)
  }

  function injectSpecialProperties (variables) {
    if (!variables._vars) {
      Object.defineProperty(variables, '_vars', {
        get: () => {
          if (VARIABLES_PROXY) {
            return VARIABLES_PROXY
          }
          VARIABLES_PROXY = createObjectProxy(variables)
          return VARIABLES_PROXY
        }
      })
    }
    if (!variables._map) {
      Object.defineProperty(variables, '_map', {
        get: () => {
          return wrappedMap
        }
      })
    }
    if (!variables._filter) {
      Object.defineProperty(variables, '_filter', {
        get: () => {
          return wrappedFilter
        }
      })
    }
    if (!variables._runChain) {
      Object.defineProperty(variables, '_runChain', {
        get: () => {
          // use closure to create runChain function
          return wrapRunChain(variables)
        }
      })
    }
  }

  function wrapRunChain (variables) {
    return (chain, ...args) => {
      const callback = args.pop()
      // only dollar should be passed to the sub-chain
      let dollar = {}
      if (util.isRealObject(variables.$)) {
        dollar = Object.assign(dollar, variables.$)
      }
      executeChain(chain, args, {$: dollar}, callback)
    }
  }

  function wrappedMap (list, chain, callback) {
    map(list, chain, VARIABLES, callback)
  }

  function wrappedFilter (list, chain, callback) {
    filter(list, chain, VARIABLES, callback)
  }

  function map (list, chain, variables, callback) {
    if (!util.isArray(list) || list.length === 0) {
      return setImmediate(() => { callback(null, []) })
    }
    nsync = requireOnce('neo-async')
    // just for testing and trigger cache mechanism
    executeChain(chain, [list[0]], variables, (error, firstElement) => {
      if (error) {
        return setImmediate(() => { callback(error, null) })
      }
      const action = (element, next) => {
        executeChain(chain, [element], variables, (error, result) => {
          next(error, result)
        })
      }
      return nsync.map(list.slice(1), action, (error, elements) => {
        if (error) {
          return callback(error, null)
        }
        elements.unshift(firstElement)
        return callback(null, elements)
      })
    })
  }

  function filter (list, chain, variables, callback) {
    if (!util.isArray(list) || list.length === 0) {
      return setImmediate(() => { callback(null, []) })
    }
    nsync = requireOnce('neo-async')
    // just for testing and trigger cache mechanism
    executeChain(chain, [list[0]], variables, (error, firstFilter) => {
      if (error) {
        return setImmediate(() => { callback(error, null) })
      }
      const action = (element, next) => {
        executeChain(chain, [element], variables, (error, result) => {
          next(error, result)
        })
      }
      return nsync.filter(list.slice(1), action, (error, elements) => {
        if (error) {
          return callback(error, null)
        }
        if (firstFilter) {
          elements.unshift(list[0])
        }
        return callback(null, elements)
      })
    })
  }

  function parseAndCacheChain (chainScript, vars, callback) {
    chimlParser = requireOnce('./core-chiml-parser.js')
    return chimlParser.parseChiml(chainScript, (error, chainObj) => {
      if (error) {
        return callback(error, null, null)
      }
      ENV_CACHE[chain] = {}
      if (vars._description) {
        ENV_CACHE[chain]._description = vars._description
      }
      if (vars._chain_cwd) {
        ENV_CACHE[chain]._chain_cwd = vars._chain_cwd
      }
      OBJ_CACHE[chain] = chainObj
      return callback(null, chainObj, vars)
    })
  }

  function executeChainScript (chainScript, ins, vars, callback) {
    parseAndCacheChain(String(chainScript), vars, (error, chainObj, newVars) => {
      if (error) {
        console.error(COLOR_FG_YELLOW + 'CHIML Script: \n' + chainScript + COLOR_FG_RED)
        console.error(error)
        console.error(COLOR_RESET)
        return setImmediate(() => { callback(error, null) })
      }
      return runRootChain(chainObj, ins, newVars, callback)
    })
  }

  function logMessage (message) {
    const description = VARIABLES._description
    const isoDate = (new Date()).toISOString()
    return console.error(COLOR_FG_YELLOW + '[' + description + ' ' + isoDate + '] ' + message + COLOR_RESET)
  }
}
