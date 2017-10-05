#! /usr/bin/env node
'use strict'

module.exports = {
    'getTrueRootChain' : getTrueRootChain,
    'getInspectedObject' : getInspectedObject
}

const coreutil = require('util')
const safeEval = require('safe-eval')
const cmd = require('./cmd.js')
const util = require('./util.js')

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
    'jikaTidak': 'else',
    'jika_tidak': 'ele',
    'seri': 'series',
    'paralel': 'parallel',
    'bersamaan': 'bersamaan',
    // boso jowo keyword
    'dhawuhe': 'command',
    'yen': 'if',
    'nalika': 'while',
    'liyane': 'else',
    'yenOra': 'else',
    'yen_ora': 'else',
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

let CHAIN_ID = 1

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

function getChainWithTrueMode (chain) {
    for (let mode of ['series', 'parallel']) {
        if (mode in chain) {
            chain.mode = mode
            chain.chains = chain[mode]
            delete chain[mode]
        }
    }
    return chain
}

function getFilteredObject (obj, exceptionKeys) {
    let newObj = {}
    for (let key in obj) {
        if (exceptionKeys.indexOf(key) === -1) {
            newObj[key] = obj[key]
        }
    }
    return newObj
}

function getIfPart (chain) {
    return getFilteredObject(chain, ['else'])
}

function getProcessedElsePart (chain) {
    let elseChain = chain.else
    elseChain = getChainAsObject(elseChain)
    elseChain.if = '!(' + chain.if + ')'
    return elseChain
}

function getProcessedIfElseChain (chain) {
    let chainHasElse = 'else' in chain
    if (!chainHasElse) {
        return chain
    }
    let elseIsString = util.isString(chain.else)
    let elseIsNonEmptyObject = util.isRealObject(chain.else) && Object.keys(chain.else).length > 0
    let ifChain = getIfPart(chain)
    if (elseIsString || elseIsNonEmptyObject) {
        let elseChain = getProcessedElsePart(chain)
        return {
            'mode': 'parallel',
            'chains': [ifChain, elseChain],
            'if': true,
            'while': false
        }
    }
    return ifChain
}

function getProcessedErrorPart (chain) {
    return {
        'if': chain.error,
        'ins': chain.errorMessage,
        'out': '_error_message',
        'command': ''
    }
}

function getNonErrorPart (chain) {
    return getFilteredObject(chain, ['error', 'errorMessage'])
}

function getProcessedErrorChain (chain) {
    let chainHasError = 'error' in chain
    if (chainHasError) {
        let nonErrorChain = getNonErrorPart(chain)
        let errorChain = getProcessedErrorPart(chain)
        return {
            'mode': 'series',
            'chains': [nonErrorChain, errorChain],
            'if': true,
            'while': false
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
    let commandParts = getTrimmedArrayElements(util.smartSplit(commandString, '-->'))
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
    let commandParts = getTrimmedArrayElements(util.smartSplit(commandString, '->'))
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
    // if ins surounded by (), getUnwrapped it
    if (newChain.ins.match(MATCH_INSIDE_PARANTHESES_PATTERN)) {
        return {
            'ins': getUnwrapped(newChain.ins),
            'command': newChain.command,
            'out': newChain.out
        }
    }
    return newChain
}

function getUnwrapped (string) {
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

function getWrappedNormalFunction (command) {
    return (...args) => {
        let callback = args.pop()
        let context = args.shift()
        let fn = safeEval(command, context)
        let result = fn(...args)
        callback(null, result)
    }
}

function getWrappedPromise (command) {
    return (...args) => {
        let callback = args.pop()
        let context = args.shift()
        let promise = safeEval(command, context)
        promise.then((result) => { callback(null, result) })
    }
}

function getWrappedCallbackFunction (command) {
    return (...args) => {
        let context = args.shift()
        let fn = safeEval(command, context)
        fn(...args)
    }
}

function getWrappedShellCommand (command) {
    return (...args) => {
        let context = args.shift()
        let callback = args.pop()
        for (let value of args) {
            command += ' ' + util.quote(value.trim())
        }
        cmd.get(command, {cwd: context._chain_cwd}, callback)
    }
}

function getNormalFunctionCompiledCommand (chain) {
    let command = getUnwrapped(chain.command)
    chain.compiledCommand = getWrappedNormalFunction(command)
    return chain
}

function getCallbackFunctionCompiledCommand (chain) {
    let command = getUnwrapped(chain.command)
    chain.compiledCommand = getWrappedCallbackFunction(command)
    return chain
}

function getPromiseCompiledCommand (chain) {
    let command = getUnwrapped(chain.command)
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
    if (!hasCommand) {
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
    chain = getChainWithStandardKey(chain)
    chain = getChainWithDefaultValues(chain) // chain has 'if' and 'while'
    chain = getProcessedErrorChain(chain) // if chain has 'error', split it into a nested chain
    chain = getProcessedIfElseChain(chain) // if chain has 'else', split it into a nested chain
    chain = getChainWithId(chain) // chain has 'id' property
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

function getTrueRootChain (chain) {
    let ins, out, vars
    chain = getChainAsObject(chain) // chain is now and object
    chain = getChainWithStandardKey(chain)
    ins = 'ins' in chain ? chain.ins : ''
    out = 'out' in chain ? chain.out : ''
    vars = chain.vars
    chain = getTrueChain(chain)
    chain.ins = ins
    chain.out = out
    chain.vars = vars
    CHAIN_ID = 1
    return getTidyChain(chain)
}
