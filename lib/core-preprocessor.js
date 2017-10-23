#! /usr/bin/env node
'use strict'

module.exports = {
  getTrueRootChain
}

const KEY_ORDER = ['id', 'branch', 'vars', 'ins', 'out', 'verbose', 'command', 'compiledCommand', 'mode', 'chains', 'loop']
const KEY_SYNONYM = {
  'if': 'branch',
  'while': 'loop',
  'process': 'command',
  'do': 'command',
  'input': 'ins',
  'inputs': 'ins',
  'output': 'out',
  'outs': 'out',
  'outputs': 'out',
  'otherwise': 'else',
  'instead': 'else',
  'child': 'chains',
  'serial': 'series',
  'catch': 'errorCondition',
  'raise': 'errorMessage',
  'throw': 'errorMessage',
  // bahasa Indonesia keyword
  'proses': 'command',
  'perintah': 'command',
  'lakukan': 'command',
  'masukan': 'ins',
  'keluaran': 'out',
  'jika': 'branch',
  'selama': 'loop',
  'selainItu': 'else',
  'sebaliknya': 'else',
  'seri': 'series',
  'paralel': 'parallel',
  // boso jowo keyword
  'nindakake': 'command',
  'yen': 'branch',
  'nalika': 'loop',
  'liyane': 'else',
  'yenOra': 'else'
}

const MATCH_INSIDE_SQUARE_BRACKETS_PATTERN = /^\[(.+)\]$/g
const MATCH_INSIDE_PARANTHESES_PATTERN = /^\((.+)\)$/g
const MATCH_INSIDE_BRACES_PATTERN = /^\{(.+)\}$/g
const MATCH_INSIDE_CHEVRONS_PATTERN = /^<(.+)>$/g
const MATCH_ARROW_FUNCTION_PATTERN = /^.+=>.+/g

const safeEval = require('safe-eval')
const cmd = require('./cmd.js')
const util = require('./util.js')
const dollar = require('./core-dollar.js')

function getTrueRootChain (chain) {
  let CHAIN_ID = 1

  let ins, out, vars
  CHAIN_ID = 1
  chain = getTrueChain(chain)
  ins = 'ins' in chain ? chain.ins : ''
  out = 'out' in chain ? chain.out : '_ans'
  vars = 'vars' in chain && util.isRealObject(chain.vars) ? chain.vars : {}
  if ('verbose' in chain) {
    vars._verbose = chain.verbose
  } else {
    vars._verbose = 0
  }
  chain.ins = ins
  chain.out = out
  chain.vars = vars
  return getTidyChain(chain)

  function getChainAsObject (chain) {
    if (util.isString(chain)) {
      return {'command': chain}
    }
    return chain
  }

  function getChainWithId (chain) {
    chain.id = CHAIN_ID++
    return chain
  }

  function getChainWithDefaultValues (chain) {
    let defaultValues = {
      'branch': 'true',
      'loop': 'false'
    }
    for (let key in defaultValues) {
      if (!(key in chain)) {
        chain[key] = defaultValues[key]
      }
    }
    return chain
  }

  function getChainWithTrueMode (chain) {
    for (let mode of ['series', 'parallel']) {
      if (mode in chain) {
        chain.chains = chain[mode]
        chain.mode = mode
      }
    }
    return chain
  }

  function getIfPart (chain) {
    return util.getFilteredObject(chain, ['else'])
  }

  function getProcessedElsePart (chain) {
    let elseChain
    if (util.isArray(chain.else)) {
      elseChain = {'mode': 'series', 'chains': chain.else}
    } else {
      elseChain = chain.else
    }
    elseChain = getChainAsObject(elseChain)
    elseChain.branch = '!(' + chain.branch + ')'
    return elseChain
  }

  function getProcessedIfElseChain (chain) {
    let chainHasElse = 'else' in chain
    if (!chainHasElse) {
      return chain
    }
    let elseIsString = util.isString(chain.else)
    let elseIsNonEmptyObject = util.isRealObject(chain.else) && Object.keys(chain.else).length > 0
    let elseIsNonEmptyArray = util.isArray(chain.else) && chain.else.length > 0
    let ifChain = getIfPart(chain)
    if (elseIsString || elseIsNonEmptyObject || elseIsNonEmptyArray) {
      let elseChain = getProcessedElsePart(chain)
      let result = {
        'ins': ifChain.ins,
        'out': ifChain.out,
        'verbose': ifChain.verbose,
        'mode': 'parallel',
        'chains': [ifChain, elseChain],
        'branch': true,
        'loop': false
      }
      return result
    }
    return ifChain
  }

  function getProcessedErrorPart (chain) {
    return {
      'branch': chain.errorCondition,
      'series': [
        {
          'ins': [chain.errorMessage],
          'out': '_error_message',
          'command': ''
        },
        {
          'ins': [true],
          'out': '_error',
          'command': ''
        }
      ]
    }
  }

  function getNonErrorPart (chain) {
    return util.getFilteredObject(chain, ['errorCondition', 'errorMessage'])
  }

  function getProcessedErrorChain (chain) {
    let chainHasError = 'errorCondition' in chain
    if (chainHasError) {
      let nonErrorChain = getNonErrorPart(chain)
      let errorChain = getProcessedErrorPart(chain)
      return {
        'ins': nonErrorChain.ins,
        'out': nonErrorChain.out,
        'verbose': nonErrorChain.verbose,
        'mode': 'series',
        'chains': [errorChain, nonErrorChain, errorChain],
        'branch': true,
        'loop': false
      }
    }
    return chain
  }

  function getTrimmedArrayElements (arrayOfString) {
    let newArray = []
    for (let value of arrayOfString) {
      newArray.push(value.trim())
    }
    return newArray
  }

  function splitCommandStringByLongArrow (commandString) {
    let commandParts = getTrimmedArrayElements(util.getSmartSplitted(commandString, '-->'))
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
    let commandParts = getTrimmedArrayElements(util.getSmartSplitted(commandString, '->'))
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
    // if ins surounded by (), util.getUnwrapped it
    if (newChain.ins.match(MATCH_INSIDE_PARANTHESES_PATTERN)) {
      return {
        'ins': util.getUnwrapped(newChain.ins),
        'command': newChain.command,
        'out': newChain.out
      }
    }
    return newChain
  }

  function defineDefaultChainOut (chain) {
    if (('out' in chain) && (chain.out === '')) {
      chain.out = '_ans'
    }
    return chain
  }

  function defineDefaultChainCommand (chain) {
    let hasCommand = 'command' in chain
    let hasChains = 'chains' in chain
    let commandIsEmpty = hasCommand && chain.command === ''
    if (!hasChains && (!hasCommand || commandIsEmpty)) {
      chain.command = '[$.assignValue]'
    }
    return chain
  }

  function getJsExecutable (command, context) {
    let match = command.match(/^\$\.(\w+)$/)
    if (match) {
      return dollar[match[1]]
    }
    return safeEval(command, context)
  }

  function getWrappedNormalFunction (command) {
    return (...args) => {
      let callback = args.pop()
      let context = args.shift()
      let fn = getJsExecutable(command, context)
      let result = fn(...args)
      callback(null, result)
    }
  }

  function getWrappedPromise (command) {
    return (...args) => {
      let callback = args.pop()
      let context = args.shift()
      let promise = getJsExecutable(command, context)
      promise.then((result) => { callback(null, result) })
    }
  }

  function getWrappedCallbackFunction (command) {
    return (...args) => {
      let context = args.shift()
      let fn = getJsExecutable(command, context)
      fn(...args)
    }
  }

  function getWrappedShellCommand (command) {
    return (...args) => {
      let context = args.shift()
      let callback = args.pop()
      for (let value of args) {
        command += ' ' + util.getQuoted(String(value).trim())
      }
      cmd.get(command, {cwd: context._chain_cwd}, callback)
    }
  }

  function getNormalFunctionCompiledCommand (chain) {
    let command = util.getUnwrapped(chain.command)
    chain.compiledCommand = getWrappedNormalFunction(command)
    return chain
  }

  function getCallbackFunctionCompiledCommand (chain) {
    let command = util.getUnwrapped(chain.command)
    chain.compiledCommand = getWrappedCallbackFunction(command)
    return chain
  }

  function getPromiseCompiledCommand (chain) {
    let command = util.getUnwrapped(chain.command)
    chain.compiledCommand = getWrappedPromise(command)
    return chain
  }

  function getShellCompiledCommand (chain) {
    let command = chain.command
    chain.compiledCommand = getWrappedShellCommand(command)
    return chain
  }

  function getCompiledCommand (chain) {
    let hasCommand = 'command' in chain
    if (!hasCommand || !util.isString(chain.command)) {
      return chain
    }
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
      chain = getNormalFunctionCompiledCommand(chain)
    } else if (isCallbackJs) { // callbackjs is surrounded by []
      chain = getCallbackFunctionCompiledCommand(chain)
    } else if (isPromiseJs) { // promiseJs is surrounded by <>
      chain = getPromiseCompiledCommand(chain)
    } else { // cmd is not surrounded by anything
      chain = getShellCompiledCommand(chain)
    }
    return chain
  }

  function getChainWithTrueCommand (chain) {
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
    chain = getCompiledCommand(chain)
    return chain
  }

  function getChainWithStandardKey (chain) {
    let standardChain = {}
    for (let key in chain) {
      if (!(key in KEY_SYNONYM)) {
        standardChain[key] = chain[key]
      } else {
        let realKey = KEY_SYNONYM[key]
        standardChain[realKey] = chain[key]
      }
    }
    return standardChain
  }

  function getRevealedHiddenNestedChain (chain) {
    if (!('command' in chain) || !util.isArray(chain.command)) {
      return chain
    }
    let excludedKeys = ['mode', 'chains', 'command', 'series', 'parallel']
    let newChain = util.getFilteredObject(chain, excludedKeys)
    newChain.mode = 'series'
    newChain.chains = chain.command
    return newChain
  }

  function getExceptionKeys (chain) {
    let exceptionKeys = []
    if (chain.id !== 1) {
      exceptionKeys.push('vars')
      exceptionKeys.push('verbose')
      if (('mode' in chain) && ('chains' in chain)) {
        exceptionKeys.push('ins')
        exceptionKeys.push('out')
        exceptionKeys.push('command')
      } else {
        exceptionKeys.push('mode')
        exceptionKeys.push('chains')
      }
    }
    return exceptionKeys
  }

  function getTidyChain (chain) {
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
    chain = getChainAsObject(chain) // chain is now and object
    chain = getChainWithStandardKey(chain) // chain is now having standard keys instead of bahasa, javanese and other variations
    chain = getChainWithDefaultValues(chain) // chain has 'branch' and 'loop'
    chain = getProcessedErrorChain(chain) // if chain has 'error', split it into a nested chain
    chain = getProcessedIfElseChain(chain) // if chain has 'else', split it into a nested chain
    chain = getChainWithId(chain) // chain has 'id' property
    chain = getRevealedHiddenNestedChain(chain) // hidden nested chain (the one with command key but has many subchain) is now normalized
    chain = getChainWithTrueMode(chain) // 'series' and 'parallel' key has been changed into 'mode' and 'chains'
    chain = getChainWithTrueCommand(chain) // processing '->' and '-->', the semantic is: (ins) -> {process} -> out
    chain = getTidyChain(chain)
    if ('chains' in chain) {
      for (let i = 0; i < chain.chains.length; i++) {
        chain.chains[i] = getTrueChain(chain.chains[i])
      }
    }
    return chain
  }
}
