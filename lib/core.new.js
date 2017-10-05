#! /usr/bin/env node
'use strict'

// export
module.exports = {
  'executeChain': executeChain,
  'run': run,
  'load': load
}

// imports
const async = require('neo-async')
const fs = require('fs')
const yaml = require('js-yaml')
const stringify = require('json-stringify-safe')
const path = require('path')
const coreutil = require('util')
const safeEval = require('safe-eval')
const cmd = require('./cmd.js')
const util = require('./util.js')

// constants
const $ = {
  'run': run,
  'load': load,
  'assignValue': assignValue,
  // bahasa Indonesia keyword
  'jalankan': run,
  'muat': load,
  // boso jowo keyword
  'nindakake': run,
  'mbukak': load
}
const SILENT = 0
const VERBOSE = 1
const VERY_VERBOSE = 2
const ULTRA_VERBOSE = 3
const KEY_ORDER = ['id', 'if', 'vars', 'ins', 'out', 'command', 'compiledCommand', 'mode', 'chains', 'while']
const KEY_SYNONYM = {
  'process': 'command',
  'input': 'ins',
  'inputs': 'ins',
  'output': 'out',
  'outs': 'out',
  'outputs': 'out',
  'error_condition': 'error',
  'error_message': 'errorMessage',
  'otherwise': 'else',
  'child': 'chains',
  'serial': 'series',
  // bahasa Indonesia keyword
  'proses': 'command',
  'perintah': 'command',
  'masukan': 'ins',
  'keluaran': 'out',
  'kondisi': 'if',
  'jika': 'if',
  'selama': 'while',
  'silap': 'error',
  'kesalahan': 'error',
  'kondisiError': 'error',
  'kondisiSilap': 'error',
  'kondisiKesalahan': 'error',
  'kondisi_error': 'error',
  'kondisi_silap': 'error',
  'kondisi_kesalahan': 'error',
  'pesanError': 'errorMessage',
  'pesanSilap': 'errorMessage',
  'pesanKesalahan': 'errorMessage',
  'pesan_error': 'errorMessage',
  'pesan_silap': 'errorMessage',
  'pesan_kesalahan': 'errrorMessage',
  'selainItu': 'else',
  'selain_itu': 'else',
  'seri': 'series',
  'paralel': 'parallel',
  'bersamaan': 'bersamaan',
  // boso jowo keyword
  'dhawuhe': 'command',
  'yen': 'if',
  'nalika': 'while',
  'liyane': 'else',
  'podoKaro': 'parallel',
  'podo_karo': 'parallel',
  'bebarengan': 'parallel',
  'sijiSiji': 'series',
  'siji_siji': 'series'
}

const MATCH_INSIDE_SQUARE_BRACKETS_PATTERN = /^\[.+\]$/g
const MATCH_INSIDE_PARANTHESES_PATTERN = /^\(.+\)$/g
const MATCH_INSIDE_BRACES_PATTERN = /^\{.+\}$/g
const MATCH_INSIDE_CHEVRONS_PATTERN = /^<.+>$/g
const MATCH_ARROW_FUNCTION_PATTERN = /^.+=>.+/g

// initial value of VARIABLES
var VARIABLES = {}
var CHAIN_ID = 1

function executeChain (userChain, inputs, variables) {
  assignToVariables(variables)
}

function assignToVariables (variables) {
  for (let variableName in variables) {
    VARIABLES[variableName] = variables[variableName]
  }
}

function load (moduleName, functionName) {}

function run () {}

function objectifyChain (chain) {
  if (util.isString(chain)) {
    return {'command': chain}
  }
  return chain
}

function addIdToChain (chain) {
  chain.id = CHAIN_ID++
  return chain
}

function addIfAndWhileToChain (chain) {
  let defaultValues = {
    'if': 'true',
    'while': 'false'
  }
  for (let key in defaultValues) {
    if (!(key in chain)) {
      chain[key] = defaultValues[key]
    }
  }
  return chain
}

function normalizeChainMode (chain) {
  for (let mode of ['series', 'parallel']) {
    if (mode in chain) {
      chain.mode = mode
      chain.chains = chain[mode]
      delete chain[mode]
    }
  }
  return chain
}

function copyObjectWithException (obj, exceptionKeys) {
  let newObj = {}
  for (let key in obj) {
    if (exceptionKeys.indexOf(key) === -1) {
      newObj[key] = obj[key]
    }
  }
  return newObj
}

function createIfChain (chain) {
  return copyObjectWithException(chain, ['else'])
}

function createElseChain (chain) {
  let elseChain = chain.else
  elseChain = objectifyChain(elseChain)
  elseChain.if = '!(' + chain.if + ')'
  return elseChain
}

function normalizeChainElse (chain) {
  let chainHasElse = 'else' in chain
  if (chainHasElse) {
    let elseIsString = util.isString(chain.else)
    let elseIsNonEmptyObject = util.isRealObject(chain.else) && Object.keys(chain.else).length > 0
    let ifChain = createIfChain(chain)
    if (elseIsString || elseIsNonEmptyObject) {
      let elseChain = createElseChain(chain)
      return {
        'mode': 'parallel',
        'chains': [ifChain, elseChain],
        'if': true,
        'while': false
      }
    }
    return ifChain
  }
  return chain
}

function createErrorChain (chain) {
  return {
    'if': chain.error,
    'ins': chain.errorMessage,
    'out': '_error_message',
    'command': ''
  }
}

function createNonErrorChain (chain) {
  return copyObjectWithException(chain, ['error', 'errorMessage'])
}

function normalizeChainError (chain) {
  let chainHasError = 'error' in chain
  if (chainHasError) {
    let nonErrorChain = createNonErrorChain(chain)
    let errorChain = createErrorChain(chain)
    return {
      'mode': 'series',
      'chains': [nonErrorChain, errorChain],
      'if': true,
      'while': false
    }
  }
  return chain
}

function trimArrayElements (arrayOfString) {
  let newArray = []
  for (let value of arrayOfString) {
    newArray.push(value.trim())
  }
  return newArray
}

function splitCommandStringByLongArrow (commandString) {
  let commandParts = trimArrayElements(util.smartSplit(commandString, '-->'))
  if (commandParts.length > 1) {
    // pattern: ins --> out
    return {
      'ins': commandParts[0],
      'out': commandParts[1],
      'command': ''
    }
  }
  return null
}

function splitCommandStringByShortArrow (commandString) {
  let commandParts = trimArrayElements(util.smartSplit(commandString, '->'))
  if (commandParts.length > 2) {
    // pattern: ins -> command -> out
    return {
      'ins': commandParts[0],
      'command': commandParts[1],
      'out': commandParts[2]
    }
  } else if (commandParts.length === 2) {
    if (commandParts[0].match(MATCH_INSIDE_PARANTHESES_PATTERN)) {
      // pattern: (ins) -> command
      return {
        'ins': commandParts[0],
        'command': commandParts[1],
        'out': ''
      }
    } else {
      // pattern: command -> out
      return {
        'ins': '',
        'command': commandParts[0],
        'out': commandParts[1]
      }
    }
  }
  return {
    'ins': '',
    'command': commandString,
    'out': ''
  }
}

function splitCommandString (commandString) {
  let newChain = splitCommandStringByLongArrow(commandString)
  if (util.isNullOrUndefined(newChain)) {
    newChain = splitCommandStringByShortArrow(commandString)
  }
  // if ins surounded by (), unwrap it
  if (newChain.ins.match(MATCH_INSIDE_PARANTHESES_PATTERN)) {
    return {
      'ins': unwrap(newChain.ins),
      'command': newChain.command,
      'out': newChain.out
    }
  }
  return newChain
}

function unwrap (string) {
  return string.trim().substring(1, string.length - 1)
}

function defineDefaultChainOut (chain) {
  if (('out' in chain) && (chain.out === '')) {
    chain.out = '_ans'
  }
  return chain
}

function defineDefaultChainCommand (chain) {
  let hasCommand = 'command' in chain
  let commandIsNotEmpty = hasCommand && chain.command === ''
  if (hasCommand && commandIsNotEmpty) {
    chain.command = '[$.assignValue]'
  }
  return chain
}

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

function wrapAndAddContextNormalJs (command) {
  return (...args) => {
    let context = Object.assign({}, VARIABLES)
    let callback = args.pop()
    let fn = safeEval(command, context)
    let result = fn(...args)
    callback(null, result)
  }
}

function wrapAndAddContextPromiseJs (command) {
  return (...args) => {
    let context = Object.assign({}, VARIABLES)
    let callback = args.pop()
    let promise = safeEval(command, context)
    promise.then((result) => { callback(null, result) })
  }
}

function wrapAndAddContextCallbackJs (command) {
  return (...args) => {
    let context = Object.assign({}, VARIABLES)
    let fn = safeEval(command, context)
    fn(...args)
  }
}

function wrapAndAddContextCmd (command) {
  return (...args) => {
    let callback = args.pop()
    for (let value of args) {
      command += ' ' + util.quote(value.trim())
    }
    cmd.get(command, {cwd: VARIABLES._chain_cwd}, callback)
  }
}

function defineTrueScriptForNormalJs (chain) {
  let command = unwrap(chain.command)
  chain.compiledCommand = wrapAndAddContextNormalJs(command)
  return chain
}

function defineTrueScriptForCallbackJs (chain) {
  let command = unwrap(chain.command)
  chain.compiledCommand = wrapAndAddContextCallbackJs(command)
  return chain
}

function defineTrueScriptForPromiseJs (chain) {
  let command = unwrap(chain.command)
  chain.compiledCommand = wrapAndAddContextPromiseJs(command)
  return chain
}

function defineTrueScriptForCmd (chain) {
  let command = chain.command
  chain.compiledCommand = wrapAndAddContextCmd(command)
  return chain
}

function defineTrueScript (chain) {
  let hasCommand = 'command' in chain
  if (hasCommand) {
    let isNormalJs = chain.command.match(MATCH_INSIDE_BRACES_PATTERN)
    let isCallbackJs = chain.command.match(MATCH_INSIDE_SQUARE_BRACKETS_PATTERN)
    let isPromiseJs = chain.command.match(MATCH_INSIDE_CHEVRONS_PATTERN)
    let isArrowFunction = chain.command.match(MATCH_ARROW_FUNCTION_PATTERN)
    // arrowFunction should be processed as normalJs
    if (!isNormalJs && !isPromiseJs && !isCallbackJs && isArrowFunction) {
      chain.command = '{' + chain.command + '}'
      isNormalJs = true
    }
    if (isNormalJs) { // normalJs is surrounded by {}
      chain = defineTrueScriptForNormalJs(chain)
    } else if (isCallbackJs) { // callbackjs is surrounded by []
      chain = defineTrueScriptForCallbackJs(chain)
    } else if (isPromiseJs) { // promiseJs is surrounded by <>
      chain = defineTrueScriptForPromiseJs(chain)
    } else { // cmd is not surrounded by anything
      chain = defineTrueScriptForCmd(chain)
    }
  }
  return chain
}

function normalizeChainCommand (chain) {
  if (util.isString(chain.command)) {
    let obj = splitCommandString(chain.command)
    if (!('ins' in chain)) {
      chain.ins = obj.ins
    }
    if (!('out' in chain)) {
      chain.out = obj.out
    }
    chain.command = obj.command
  }
  chain = defineDefaultChainOut(chain)
  chain = defineDefaultChainCommand(chain)
  chain = defineTrueScript(chain)
  return chain
}

function normalizeSynonymKey (chain) {
  for (let key in KEY_SYNONYM) {
    let realKey = KEY_SYNONYM[key]
    if ((key in chain) && !(realKey in chain)) {
      chain[realKey] = chain[key]
    }
  }
  return chain
}

function getInspectedObject (variables) {
  return coreutil.inspect(variables, false, null)
}

function getExceptionKeys (chain) {
  let exceptionKeys = []
  if (chain.id !== 1) {
    exceptionKeys.push('vars')
  }
  if (('mode' in chain) && ('chains' in chain)) {
    exceptionKeys.push('ins')
    exceptionKeys.push('out')
    exceptionKeys.push('command')
  } else {
    exceptionKeys.push('mode')
    exceptionKeys.push('chains')
  }
  return exceptionKeys
}

function tidyUpChain (chain) {
  let tidyChain = {}
  let exceptionKeys = getExceptionKeys(chain)
  for (let key of KEY_ORDER) {
    if ((key in chain) && (exceptionKeys.indexOf(key) === -1)) {
      tidyChain[key] = chain[key]
    }
  }
  return tidyChain
}

function getTrueChain (chain) {
  chain = objectifyChain(chain) // chain is now and object
  chain = normalizeSynonymKey(chain)
  chain = addIfAndWhileToChain(chain) // chain has 'if' and 'while'
  chain = normalizeChainError(chain) // if chain has 'error', split it into a nested chain
  chain = normalizeChainElse(chain) // if chain has 'else', split it into a nested chain
  chain = addIdToChain(chain) // chain has 'id' property
  chain = normalizeChainMode(chain) // 'series' and 'parallel' key has been changed into 'mode' and 'chains'
  chain = normalizeChainCommand(chain) // processing '->' and '-->', the semantic is: (ins) -> {process} -> out
  chain = tidyUpChain(chain)
  if ('chains' in chain) {
    for (let i = 0; i < chain.chains.length; i++) {
      chain.chains[i] = getTrueChain(chain.chains[i])
    }
  }
  return chain
}

function getTrueRootChain (chain) {
  let ins, out, vars
  chain = objectifyChain(chain) // chain is now and object
  ins = 'ins' in chain ? chain.ins : ''
  out = 'out' in chain ? chain.out : ''
  vars = chain.vars
  chain = getTrueChain(chain)
  chain.ins = ins
  chain.out = out
  chain.vars = vars
  CHAIN_ID = 1
  return tidyUpChain(chain)
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

function wrapFinalCallback (chain, finalCallback) {
  return (error, allValues) => {
    if (util.isNullOrUndefined(finalCallback)) {
      finalCallback = (error, value) => {
        if (error) {
          console.error(error)
        } else {
          console.log(value)
        }
      }
    }
    let result = evaluateStatement(chain.out)
    result = normalizeOutputValue(result)
    finalCallback(error, result)
  }
}

function runRootChain (chain, insValue = [], vars = {}, finalCallback = null) {
  chain = getTrueRootChain(chain)
  let ins = getInsNameAsArray(chain.ins)
  VARIABLES = Object.assign({}, {$}, {'_ans': null,
    '_error': false,
    '_error_message': '',
    '_init_cwd': util.addTrailingSlash(process.cwd()),
    '_chain_cwd': util.addTrailingSlash(process.cwd()),
    '_verbose': SILENT,
    '_description': ''}, vars)
  finalCallback = wrapFinalCallback(chain, finalCallback)
  runChain(chain, finalCallback)
}

function evaluateStatement (key) {
  try {
    let context = Object.assign({}, VARIABLES)
    return safeEval(key, context)
  } catch (error) {
    console.error(error)
    return null
  }
}

function createChainRunner (chain, finalCallback) {
  let isHavingChildren = 'chains' in chain && util.isArray(chain.chains)
  let asyncWorker = isHavingChildren && chain.mode === 'parallel' ? async.parallel : async.series
  return (callback) => {
    let actions = []
    if(evaluateStatement(chain.if)){
      if('chains' in chain && util.isArray(chain.chains)){
        // nested chain
        for(let subChain of chain.chains){
          // if condition resolved
          actions.push((next)=>{
            let chainRunner = createChainRunner(subChain, finalCallback)
            chainRunner(next)
          })
        }
      }
      else{
        // single chain
        actions.push((next)=>{
          // add arguments
          let inputs = evaluateStatement('['+chain.ins+']')
          try{
            // add callback to the argument
            inputs.push((error, result)=>{
              if(error){
                finalCallback(error, null)
              }
              else{
                //setVar(chain.out, result)
                next()
              }
            })
            let runner = chain.command_seed()
            runner.apply(...inputs)
          }
          catch(error){
            log('Error on chain '+chain.id, SOMEHOW_VERBOSE)
            finalCallback(error, null)
          }
        })
      }
    }
    asyncWorker(actions, callback)
  }
}

if (require.main === module) {
  let CHAIN_SAMPLE = {
    'ins': 'data, abc',
    'out': 'output',
    'vars': { '_verbose': 1 },
    'if': 'Array.isArray(data)',
    'series': [
      '0 --> i',
      '0 --> max',
      {
        'while': 'i < data.length',
        'series': [
          {
            'if': 'i == 0 || data[i] > max',
            'command': '(data[i]) --> max'
          },
          '(i) -> {(i)=>{return parseInt(i)+1}} -> i'
        ]
      },
      'uname -a -> uname',
      '(5) -> [(s, callback)=>{callback(null, s+1)}] -> five_plus_one',
      '<new Promise(function(resolve, reject){resolve(73)})> -> sheldon_number',
      '(abc, "def", ghi) --> whatever',
      '(max, uname, five_plus_one, sheldon_number, whatever) --> output'
    ],
    'else': {
      'series': [
        'true --> _error',
        '"input is not array" --> _error_message'
      ]
    },
    'error': 'data.length == 0',
    'errorMessage': 'data is empty'
  }

  let trueChain = getTrueRootChain(CHAIN_SAMPLE)
  console.error(getInspectedObject(trueChain))
  runRootChain(trueChain, [[4, 5, 1, 2, 3], 'yha'])
}
