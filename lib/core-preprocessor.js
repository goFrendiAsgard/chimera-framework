'use strict'

module.exports = {
  getTrueRootChain
}

const requireOnce = require('./require-once.js')
let cmd, safeEval, stringify, util

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
  'peta': 'map',
  'petakan': 'map',
  'saring': 'filter',
  'saringlah': 'filter',
  'menuju': 'into',
  'ke': 'into',
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

function getTrueRootChain (chain) {
  util = requireOnce('./util.js')
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
    if (!('branch' in chain)) {
      chain.branch = 'true'
    }
    if (!('loop' in chain)) {
      chain.loop = 'false'
    }
    return chain
  }

  function getChainWithTrueMode (chain) {
    if ('series' in chain) {
      chain.chains = chain.series
      chain.mode = 'series'
    } else if ('parallel' in chain) {
      chain.chains = chain.parallel
      chain.mode = 'parallel'
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
    const chainHasElse = 'else' in chain
    if (!chainHasElse) {
      return chain
    }
    const elseIsString = util.isString(chain.else)
    const elseIsNonEmptyObject = util.isRealObject(chain.else) && Object.keys(chain.else).length > 0
    const elseIsNonEmptyArray = util.isArray(chain.else) && chain.else.length > 0
    const ifChain = getIfPart(chain)
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
    const chainHasError = 'errorCondition' in chain
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
    newArray = arrayOfString.map((value) => {
      return value.trim()
    })
    return newArray
  }

  function splitCommandStringByLongArrow (commandString) {
    let commandParts = getTrimmedArrayElements(util.getSmartSplitted(commandString, '<--'))
    if (commandParts.length === 1) {
      commandParts = getTrimmedArrayElements(util.getSmartSplitted(commandString, '-->'))
    } else {
      commandParts.reverse()
    }
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
    let commandParts = getTrimmedArrayElements(util.getSmartSplitted(commandString, '<-'))
    if (commandParts.length === 1) {
      commandParts = getTrimmedArrayElements(util.getSmartSplitted(commandString, '->'))
    } else {
      commandParts.reverse()
    }
    if (commandParts.length > 2) {
      // pattern: ins -> command -> out
      return {
        ins: commandParts[0],
        command: commandParts[1],
        out: commandParts[2]
      }
    } else if (commandParts.length === 2) {
      if (commandParts[0].match(MATCH_INSIDE_PARANTHESES_PATTERN)) {
        // pattern: (ins) -> command
        return {
          ins: commandParts[0],
          command: commandParts[1],
          out: ''
        }
      } else {
        // pattern: command -> out
        return {
          ins: '',
          command: commandParts[0],
          out: commandParts[1]
        }
      }
    }
    return {
      ins: '',
      command: commandString,
      out: ''
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
        ins: util.getUnwrapped(newChain.ins),
        command: newChain.command,
        out: newChain.out
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
    const hasCommand = 'command' in chain
    const hasChains = 'chains' in chain
    const commandIsEmpty = hasCommand && chain.command === ''
    if (!hasChains && (!hasCommand || commandIsEmpty)) {
      chain.command = '{$.assignValue}'
    }
    return chain
  }

  function getJsExecutable (command, context) {
    // probably already on context, try to look for it
    const commandParts = command.split('.')
    let obj = context
    let found = true
    for (let i = 0; i < commandParts.length; i++) {
      const part = commandParts[i]
      if (part in obj) {
        obj = obj[part]
      } else {
        found = false
        break
      }
    }
    if (found) {
      return obj
    }
    safeEval = requireOnce('./safe-eval.js')
    return safeEval(command, context)
  }

  function getWrappedNormalFunction (command) {
    return (...args) => {
      const callback = args.pop()
      const context = args.shift()
      try {
        const fn = getJsExecutable(command, context)
        const result = fn(...args)
        setImmediate(() => { callback(null, result) })
      } catch (error) {
        setImmediate(() => { callback(error, null) })
      }
    }
  }

  function getWrappedPromise (command) {
    return (...args) => {
      const callback = args.pop()
      const context = args.shift()
      try {
        const promise = getJsExecutable(command, context)
        promise.then((result) => {
          callback(null, result)
        }).catch((error) => {
          callback(error, null)
        })
      } catch (error) {
        setImmediate(() => { callback(error, null) })
      }
    }
  }

  function getWrappedCallbackFunction (command) {
    return (...args) => {
      const callback = args[args.length - 1]
      const context = args.shift()
      try {
        const fn = getJsExecutable(command, context)
        fn(...args)
      } catch (error) {
        setImmediate(() => { callback(error, null) })
      }
    }
  }

  function getWrappedShellCommand (command) {
    return (...args) => {
      const context = args.shift()
      const callback = args.pop()
      let shellCommand = command
      let stdin = ''
      for (let i = 0; i < args.length; i++) {
        const value = args[i]
        let strValue
        if (util.isArray(value) || util.isRealObject(value)) {
          stringify = requireOnce('json-stringify-safe')
          strValue = stringify(value)
        } else {
          strValue = String(value)
        }
        strValue = util.getQuoted(strValue.trim())
        stdin += ' ' + strValue
      }
      shellCommand += stdin
      if (stdin.length > 0) {
        shellCommand = '(chimera-echo' + stdin + ') | ' + shellCommand
      }
      cmd = requireOnce('./cmd.js')
      cmd.get(shellCommand, {cwd: context._chain_cwd}, callback)
    }
  }

  function getNormalFunctionCompiledCommand (chain) {
    const command = util.getUnwrapped(chain.command)
    chain.compiledCommand = getWrappedNormalFunction(command)
    return chain
  }

  function getCallbackFunctionCompiledCommand (chain) {
    const command = util.getUnwrapped(chain.command)
    chain.compiledCommand = getWrappedCallbackFunction(command)
    return chain
  }

  function getPromiseCompiledCommand (chain) {
    const command = util.getUnwrapped(chain.command)
    chain.compiledCommand = getWrappedPromise(command)
    return chain
  }

  function getShellCompiledCommand (chain) {
    const command = chain.command
    chain.compiledCommand = getWrappedShellCommand(command)
    return chain
  }

  function getCompiledCommand (chain) {
    const hasCommand = 'command' in chain
    if (!hasCommand || !util.isString(chain.command)) {
      return chain
    }
    const singleLineCommand = chain.command.trim().replace(/\r|\n/g, '')
    const isCallbackJs = singleLineCommand.match(MATCH_INSIDE_SQUARE_BRACKETS_PATTERN)
    const isPromiseJs = singleLineCommand.match(MATCH_INSIDE_CHEVRONS_PATTERN)
    const isArrowFunction = singleLineCommand.match(MATCH_ARROW_FUNCTION_PATTERN)
    let isNormalJs = singleLineCommand.match(MATCH_INSIDE_BRACES_PATTERN)
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
      const chainObj = splitCommandString(chain.command)
      if (chainObj.ins === '' && chainObj.out === '') {
        // chainObj only contains command
        chain.command = chainObj.command
      } else if ('ins' in chain || 'out' in chain) {
        // current chain already has ins & out
        chain.mode = 'series'
        // delete chain.command
        chain.command = null
        chain.chains = [{
          'ins': 'ins' in chainObj ? chainObj.ins : '',
          'out': 'out' in chainObj ? chainObj.out : '_ans',
          'command': 'command' in chainObj ? chainObj.command : ''
        }]
      } else {
        // current chain doesn't have ins & out
        chain.ins = chainObj.ins
        chain.out = chainObj.out
        chain.command = chainObj.command
      }
    }
    chain = defineDefaultChainOut(chain)
    chain = defineDefaultChainCommand(chain)
    chain = getCompiledCommand(chain)
    return chain
  }

  function getChainWithStandardKey (chain) {
    let standardChain = {}
    const keys = Object.keys(chain)
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i]
      if (!(key in KEY_SYNONYM)) {
        standardChain[key] = chain[key]
      } else {
        const realKey = KEY_SYNONYM[key]
        standardChain[realKey] = chain[key]
      }
    }
    return standardChain
  }

  function getRevealedHiddenNestedChain (chain) {
    if (!('command' in chain) || !util.isArray(chain.command)) {
      return chain
    }
    const excludedKeys = ['mode', 'chains', 'command', 'series', 'parallel']
    let newChain = util.getFilteredObject(chain, excludedKeys)
    newChain.mode = 'series'
    newChain.chains = chain.command
    return newChain
  }

  function getExceptionKeys (chain) {
    if (chain.id !== 1) {
      if (('mode' in chain) && ('chains' in chain)) {
        return ['map', 'filter', 'vars', 'verbose', 'ins', 'out', 'command']
      }
      return ['map', 'filter', 'vars', 'verbose', 'mode', 'chains']
    }
    return ['map', 'filter']
  }

  function getTidyChain (chain) {
    let tidyChain = {}
    const exceptionKeys = getExceptionKeys(chain)
    for (let i = 0; i < KEY_ORDER.length; i++) {
      let key = KEY_ORDER[i]
      if ((key in chain) && (exceptionKeys.indexOf(key) === -1)) {
        tidyChain[key] = chain[key]
      }
    }
    return tidyChain
  }

  function getTransformedMapAndFilter (chain) {
    if (!('filter' in chain) && !('map' in chain)) {
      return chain
    }
    const out = chain.into
    let command, ins
    let subChain = {}
    const keys = Object.keys(chain)
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i]
      if (key === 'filter' || key === 'map' || key === 'into') {
        continue
      }
      subChain[key] = chain[key]
    }
    if ('filter' in chain) {
      ins = [chain.filter, subChain]
      command = '[_filter]'
    } else if ('map' in chain) {
      ins = [chain.map, subChain]
      command = '[_map]'
    }
    return {ins, out, command}
  }

  function getTrueChain (chain) {
    chain = getChainAsObject(chain) // chain is now and object
    chain = getChainWithStandardKey(chain) // chain is now having standard keys instead of bahasa, javanese and other variations
    chain = getTransformedMapAndFilter(chain) // chain has map and filter transformed
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
