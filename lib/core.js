#! /usr/bin/env node
'use strict';

let exported = {
    'executeChain' : executeChain,
    'run' : run,
    'load' : load,
}

module.exports = exported


// imports
let async = require('neo-async')
let fs = require('fs')
let yaml = require('js-yaml')
let stringify = require('json-stringify-safe')
let cmd = require('./cmd.js')
let util = require('./util.js')
let path = require('path')

const $ = {
    'util': util,
    'cmd': cmd,
    'core': exported,
    'executeChain' : exported.executeChain,
    'run' : exported.run,
    'load' : exported.load,
}

const NOT_VERBOSE = 0
const SOMEHOW_VERBOSE = 1
const VERBOSE = 2
const VERY_VERBOSE = 3
const ULTRA_VERBOSE = 4

const KEY_SYNONIM = {
    'process' : 'command',
    'input' : 'ins',
    'inputs' : 'ins',
    'output' : 'out',
    'outs' : 'out',
    'outputs' : 'out',
}

const DEFAULT_CHAIN = {
    'id' : null,
    'ins' : [],
    'out' : '_ans',
    'if' : true,
    'mode' : null,
    'chains' : [],
    'command' : null,
    'command_seed' : null,
    'while' : false,
    'else' : null,
    'error_condition' : false,
    'error_message' : ''
}

const ASSIGN = (...args) => {
    // the last argument is callback
    let callback = args.pop()
    // determine output
    let output
    if(args.length == 1){
        output = args[0]
    }else{
        output = args
    }
    // run the callback
    callback(null, output)
}

const CMD_EXECUTOR = (...args) => {
    let callback = args.pop()
    let command = args.shift(args)
    for(let value of args){
        command += ' ' + stringify(value)
    }
    log('Running shell command: '+command, SOMEHOW_VERBOSE)
    cmd.get(command, {cwd:getVar('_chain_cwd')}, callback)
}

const LONG_ARROW = '-->'
const SHORT_ARROW = '->'

const OPT_NORMAL = 'normal'
const OPT_CALLBACK = 'callback'
const OPT_PROMISE = 'promise'
const NULL_PATTERN = /^null$/gi
const NONE_PATTERN = /^none$/gi
const TRUE_PATTERN = /^none$/gi
const FALSE_PATTERN = /^none$/gi
const NUMBER_PATTERN = /^-?[0-9]+\.?[0-9]*$/g
const MATCH_SQUARE_BRACKET_PATTERN = /\[([^\[\]]+)\]/g
const MATCH_INSIDE_SQUARE_BRACKET_PATTERN = /^\[.+\]$/g
const SQUARE_BRACKET_PATTERN = /\[|\]/g
const MATCH_PARANTHESES_PATTERN = /\(([^\[\]]+)\)/g
const MATCH_INSIDE_PARANTHESES_PATTERN = /^\(.+\)$/g
const PARANTHESES_PATTERN = /\(|\)/g
const MATCH_INSIDE_CALLBACK_WRAPPER = MATCH_INSIDE_SQUARE_BRACKET_PATTERN
const MATCH_INSIDE_PROMISE_WRAPPER = /^<(.+)>$/g
const MATCH_ANONYMOUS_FUNCTION_PATTERN = /.+=>.+/g

// initial value of VARS
var VARS = {
    '$' : $,
    '_ans' : '',
    '_error' : false,
    '_error_message' : '',
    '_init_cwd' : util.addTrailingSlash(process.cwd()),
    '_chain_cwd' : util.addTrailingSlash(process.cwd()),
    '_verbose' : false,
    '_description' : '',
}

var CHAIN_ID = 1

function log(message, verbosity=1){
    if(verbosity && getVar('_verbose', 0)>=verbosity){
        let description = getVar('_description', 0)
        let isoDate = (new Date()).toISOString()
        console.error('['+description+' '+isoDate+'] '+message)
    }
}

function logObject(variables, message = 'Object', verbosity=1){
    let coreutil = require('util')
    log(message + ':\n' + coreutil.inspect(variables, false, null), verbosity)
}

function setVar(key, value){
    key = getVarKey(key)
    try{
        let currentVar = VARS
        for(let segment of key.split('.')){
            if(!(segment in currentVar)){
                currentVar[segment] = {}
            }
            currentVar = currentVar[segment]
        }
        if(util.isNullOrUndefined(value)){
            // if value is null, delete it
            log('Delete variable '+key, VERBOSE)
            eval('delete VARS.'+key)
        }
        else{
            // if the value is string, try to evaluate
            if(util.isString(value)){
                value = value.trim('\\n')
                value = value.trim()
                try{
                    log('Getting parsed value '+stringify(value), VERY_VERBOSE)
                    eval('value = '+value)
                }
                catch(error){}
            }
            log('Assign value {'+typeof(value)+'} '+stringify(value)+' to variable '+key, VERBOSE)
            eval('VARS.'+key+' = value')
        }
    }
    catch(error){
        log('Cannot assign value {'+typeof(value)+'} '+stringify(value)+' to variable '+key, VERBOSE)
        console.error(error)
        VARS._error = true
        VARS._error_message = 'Cannot assign value {'+typeof(value)+'} '+stringify(value)+' to variable '+key+': '+error.message
    }
}

function getVarKey(key){
    let newKey
    while(true){
        newKey = key.replace(MATCH_SQUARE_BRACKET_PATTERN, function(element){
            element = element.replace(SQUARE_BRACKET_PATTERN, '')
            return '[' + stringify(getVar(element)) + ']'
        }) 
        if(newKey == key){
            break
        }
        key = newKey
    }
    return key
}

function getVar(key, verbosity=ULTRA_VERBOSE){
    let result
    // if key is "null", "none", "true", "false", or numbers then return it
    if(key.match(NULL_PATTERN) || key.match(NONE_PATTERN)){
        result = null
    }
    else if(key.match(TRUE_PATTERN)){
        result = true
    }
    else if(key.match(FALSE_PATTERN)){
        result = false
    }
    else if(key.match(NUMBER_PATTERN)){
        result = parseFloat(key)
    }
    else{
        // otherwise, try to get variable from VARS
        try{
            let varKey = getVarKey(key)
            result = eval('VARS.'+varKey)
        }
        catch(getVarError){
            try{
                // try to evaluate the javascript
                eval('result = '+key)
            }
            catch(getLiteralError){
                result = null
            }
        }
    }
    log('Getting value of '+key+' :  {'+typeof(result)+'} '+stringify(result), verbosity)
    return result
}

function createVariableDeclaration(){
    let script = ''
    for(let word in VARS){
        script +='let '+word+' = VARS.'+word+';'
    }
    return script
}

function callbackify(fn, mode=OPT_NORMAL){
    if(mode == OPT_CALLBACK){
        return fn
    }
    else if(mode == OPT_PROMISE){
        return (...args)=>{
            let callback = args.pop()
            fn.then(
                (result) => {callback(null, result)},
                (error) => {callback(error, result)}
            )
        }
    }
    else{
        // mode is OPT_NORMAL or invalid
        return (...args)=>{
            let callback = args.pop()
            try{
                let result = fn.apply(fn, args)
                callback(null, result)
            }
            catch(error){
                VARS._error = true
                VARS._error_message = error.message
                callback(error, null)
            }
        }
    }
}

function checkCondition(condition){
    if(util.isString(condition)){
        log('Processing string condition: ' + stringify(condition), VERY_VERBOSE)
        try{
            let script = '(() => {'
            script += createVariableDeclaration()
            script += 'return ('+condition+');'
            script += '})()'
            log('Checking condition result ' + stringify(condition) + ' using this script : ' +script, ULTRA_VERBOSE)
            let result = eval(script)
            return result 
        }
        catch(error){
            log('Set checking condition result to false due to evalution error', VERBOSE)
            console.error(error)
            return false
        }
    }
    return condition
}

function getChainFromLongArrow(str){
    let chainShard = util.smartSplit(str, LONG_ARROW)
    if(chainShard.length >= 2){
        // LONG ARROW: ins --> out
        return {'ins': chainShard[0], 'out':chainShard[1], 'command':'', 'command_seed':'ASSIGN'}
    }
    return null
}


function getChainFromShortArrow(str){
    let chainShard = util.smartSplit(str, SHORT_ARROW)
    if(chainShard.length >= 3){
        // SHORT ARROW COMPLETE FORM: (ins) -> command -> out
        return {'ins':chainShard[0], 'command':chainShard[1], 'out':chainShard[2], 'command_seed': chainShard[1]}
    }
    else if(chainShard.length >= 2){
        if(chainShard[0].match(MATCH_INSIDE_PARANTHESES_PATTERN)){
            // SHORT ARROW : (ins) -> command 
            return {'ins':chainShard[0], 'command':chainShard[1], 'out':'_ans', 'command_seed': chainShard[1]}
        }
        // SHORT ARROW : command -> out
        return {'ins':[], 'command':chainShard[0], 'out':chainShard[1], 'command_seed':chainShard[0]}
    }
    else{
        return {'ins':[], 'command':chainShard[0], 'out':'_ans', 'command_seed':chainShard[0]}
    }
    return null
}

function getNormalChain(chain){
    if(util.isString(chain)){
        let obj
        // LONG ARROW
        obj = getChainFromLongArrow(chain)
        if(obj !== null){
            return obj
        }
        // SHORT ARROW
        obj = getChainFromShortArrow(chain)
        return obj
    }
    else if(util.isRealObject(chain)){
        // chain is object containing command without ins and out
        // so we want to parse it as we parse the string
        if('command' in chain && !('ins' in chain) && !('out' in chain) && util.isString(chain.command)){
            let pseudoChain = getNormalChain(chain.command)
            chain = util.patchObject(chain, pseudoChain)
        }
    }
    return chain
}

function getNormalIns(ins){
    if(util.isString(ins)){ 
        if(ins.match(MATCH_INSIDE_PARANTHESES_PATTERN)){
            ins = ins.substring(1, ins.length-1)
        }
        return util.smartSplit(ins, ',')
    }
    return ins
}

function getCommandSeed(command){
    if(util.isString(command)){
        let matchCallback = command.match(MATCH_INSIDE_CALLBACK_WRAPPER)
        let matchPromise = command.match(MATCH_INSIDE_PROMISE_WRAPPER)
        let matchAnonymousFunction = command.match(MATCH_ANONYMOUS_FUNCTION_PATTERN)
        if(matchCallback || matchPromise || matchAnonymousFunction){
            try{
                if(matchCallback || matchPromise){
                    command = command.substring(1, command.length -1)
                }
                if(matchCallback){
                    // match callback
                    log('Creating command seed for '+command+' (OPT_CALLBACK)', VERBOSE)
                    return ()=>{return callbackify(eval(createVariableDeclaration() + command), OPT_CALLBACK)}
                }
                else if(matchPromise){
                    // match promise
                    log('Creating command seed for '+command+' (OPT_PROMISE)', VERBOSE)
                    return ()=>{return callbackify(eval(createVariableDeclaration() + command), OPT_PROMISE)}
                }
                else{
                    // match anonymous function
                    log('Creating command seed for '+command+' (OPT_NORMAL)', VERBOSE)
                    return ()=>{return callbackify(eval(createVariableDeclaration() + command), OPT_NORMAL)}
                }
            }
            catch(error){
                VARS._error = true
                VARS._error_message = error.message
            }
        }
        else if(command != ''){
            // command runner
            log('Creating command seed for shell command '+command, VERBOSE)
            return ()=>{
                return (...args) => {
                    // add command as argument
                    args.unshift(command)
                    CMD_EXECUTOR.apply(CMD_EXECUTOR, args)
                }
            }
        }
        else{
            // default command: pack arguments 
            log('Creating default command seed', VERBOSE)
            return ()=>{return ASSIGN}
        }
    }
    return ()=>{return command}
}

function patchAndTrimObjChain(objChain){
    let isSingle = 'command_seed' in objChain && util.isFunction(objChain.command_seed)
    // objChain
    objChain = util.patchObject(DEFAULT_CHAIN, objChain)
    let allowedProperties = ['id', 'if', 'while', 'else', 'error', 'error_message']
    if(isSingle){
        allowedProperties = allowedProperties.concat(['command_seed', 'command', 'ins', 'out'])
    }
    else{
        allowedProperties = allowedProperties.concat(['mode', 'chains'])
    }
    for(let key in objChain){
        if(allowedProperties.indexOf(key) == -1){
            delete objChain[key]
        }
    }
    objChain.id = '#' + (CHAIN_ID++)
    return objChain
}

function getTrueChain(chain, patchAndTrim = true){
    let objChain = getNormalChain(chain)
    objChain = util.replaceKey(objChain, KEY_SYNONIM)
    objChain.ins = getNormalIns(objChain.ins)
    // preprocess command and chains
    if('command' in objChain){
        objChain.command_seed = getCommandSeed(objChain.command)
    }
    else if('parallel' in objChain || 'series' in objChain || 'chains' in objChain){
        if('parallel' in objChain){
            objChain.mode = 'parallel'
            objChain.chains = objChain.parallel
            delete objChain.parallel
        }
        else if('series' in objChain){
            objChain.mode = 'series'
            objChain.chains = objChain.series
            delete objChain.series
        }
        else{
            objChain.mode = 'series'
        }
        for(let i=0; i<objChain.chains.length; i++){
            objChain.chains[i] = getTrueChain(objChain.chains[i])
        }
    }
    // preprocess else
    if(('else' in objChain) && !util.isNullOrUndefined(objChain.else)){
        objChain.else = getTrueChain(objChain.else)
    }
    if(patchAndTrim){
        return patchAndTrimObjChain(objChain)
    }
    return objChain
}

function getTrueRootChain(chain){
    let processedChain = getTrueChain(chain, false)
    // return the chain
    return {
        'id' : '#0',
        'ins' : util.deepCopy(processedChain.ins),
        'out' : util.deepCopy(processedChain.out),
        'vars' : util.deepCopy(processedChain.vars),
        'verbose': util.deepCopy(processedChain.verbose),
        'description': util.deepCopy(processedChain.description),
        'init_cwd': util.deepCopy(processedChain.init_cwd),
        'chain_cwd': util.deepCopy(processedChain.chain_cwd),
        'mode' : 'series',
        'if' : true,
        'chains': [getTrueChain(processedChain)],
        'while': false,
    }
}

function createChainRunner(chain, finalCallback){
    // undefined chain: null
    if(util.isNullOrUndefined(chain)){
        return (callback) => {
            callback()
        }
    }
    // create chain
    log('Create chain runner for: ' + chain.id, VERBOSE)
    let asyncWorker = ('chains' in chain) && 
        (util.isArray(chain.chains)) && 
        (chain.mode == 'parallel')? async.parallel: async.series
    return (callback) => {
        let actions = []
        // chain.if and chain.else are checked outside the actions, because the actions should still run even after condition state changed
        if(checkCondition(chain.if)){
            // if chainRunner
            log('If condition resolved for chain '+chain.id+': ' + chain.if, VERY_VERBOSE)
            if('chains' in chain && util.isArray(chain.chains)){
                // nested chain
                for(let subChain of chain.chains){
                    log('Find subchain of chain ' + chain.id +': '+subChain.id, ULTRA_VERBOSE)
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
                    let inputs = []
                    for(let i=0; i<chain.ins.length; i++){
                        inputs.push(getVar(chain.ins[i]))
                    }
                    try{
                        log('(chain '+chain.id+') Run ' + 
                            (chain.command==''? 'ASSIGN': JSON.stringify(chain.command)) + 
                            ' with arguments: '+ JSON.stringify(inputs), SOMEHOW_VERBOSE)
                        // add callback to the argument
                        inputs.push((error, result)=>{
                            if(error){
                                finalCallback(error, null)
                            }
                            else{
                                log('(chain '+chain.id+') Set '+chain.out+' into '+JSON.stringify(result), SOMEHOW_VERBOSE)
                                setVar(chain.out, result)
                                logObject(VARS, 'Variable', ULTRA_VERBOSE)
                                next()
                            }
                        })
                        let runner = chain.command_seed()
                        runner.apply(runner, inputs)
                    }
                    catch(error){
                        log('Error on chain '+chain.id, SOMEHOW_VERBOSE)
                        finalCallback(error, null)
                    }
                })
            }
        }
        else if('else' in chain){
            // else chainRunner
            log('If condition rejected for chain '+chain.id+': ' + chain.if, VERY_VERBOSE)
            actions.push(createChainRunner(chain.else, finalCallback))
        }
        // error checker
        if(getVar('_error')){
            log('Error condition resolved for chain ' + chain.id, VERY_VERBOSE)
            finalCallback(new Error(getVar('_error_message'), null))
        }
        else{
            log('Error condition rejected for chain ' + chain.id, ULTRA_VERBOSE)
        }
        // while chainRunner 
        actions.push((next)=>{
            if(checkCondition(chain.while)){
                log('While condition resolved for chain '+chain.id+': ' + chain.while, VERY_VERBOSE)
                let chainRunner = createChainRunner(chain, finalCallback)
                log('Run chain ' + chain.id + ' (due to while)', SOMEHOW_VERBOSE)
                asyncWorker(actions, next)
            }
            else{
                log('While condition rejected for chain '+chain.id+': ' + chain.while, ULTRA_VERBOSE)
                next()
            }
        })
        // last chain runner (only for logging purpose)
        actions.push((next)=>{
            log('Finish chain '+chain.id, SOMEHOW_VERBOSE)
            next()
        })
        log('Run chain ' + chain.id, SOMEHOW_VERBOSE)
        asyncWorker(actions, callback)
    }
}

function createDefaultCallback(userCallback){
    if(!util.isFunction(userCallback)){
        return (error, result) => {
            if(error){
                console.error(error)
            }
            else if(getVar('_error')){
                console.error(new Error(getVar('_error_message')))
            }
            else if(util.isArray(result) || util.isRealObject(result)){
                console.log(stringify(result))
            }
            else{
                console.log(result)
            }
        }
    }
    return userCallback
}

function initVars(chain, ins, vars){
    for(let key of ['description', 'verbose', 'init_cwd', 'chain_cwd']){
        if(key in chain && !util.isNullOrUndefined(chain[key])){
            setVar('_'+key, chain[key])
        }
    }
    if('vars' in chain && util.isRealObject(chain.vars)){
        for(let key in chain.vars){
            setVar(key, chain.vars[key])
        }
    }
    // set vars
    log('Preset variables: ' + JSON.stringify(vars), SOMEHOW_VERBOSE)
    for(let key in vars){
        setVar(key, vars[key])
    }
    // set ins
    log('Inputs: ' + JSON.stringify(ins), SOMEHOW_VERBOSE)
    for(let i=0; i<ins.length; i++){
        if(i<chain.ins.length){
            let key = chain.ins[i]
            setVar(key, ins[i])
        }
    }
}

function runRootChain(chain, ins=[], vars={}, userCallback){
    chain = getTrueRootChain(chain)
    initVars(chain, ins, vars)
    logObject(chain, 'Root chain', SOMEHOW_VERBOSE)
    logObject(VARS, 'Initial state', VERBOSE)
    // preprocess the callback
    userCallback = createDefaultCallback(userCallback)
    let finalActionExecuted = false
    let finalAction = (error, result) => {
        if(finalActionExecuted){
            return
        }
        finalActionExecuted = true
        userCallback(error, getVar(chain.out))
    }
    let chainRunner = createChainRunner(chain, finalAction)
    async.series([chainRunner], finalAction)
}

function executeChain(chain, ins=[], vars={}, finalCallback=null){
    if(util.isFunction(ins)){
        finalCallback = ins
        ins = []
    }
    else if(util.isFunction(vars) && util.isArray(ins)){
        finalCallback = vars
        vars = {}
    }
    else if(util.isFunction(vars)){
        finalCallback = vars
        vars = ins
        ins = []
    }
    util.readJsonOrYaml(chain, function(error, chainObj){
        if(!error){
            let chainPath = path.resolve(chain)
            let dirName = path.dirname(chainPath)
            let baseName = path.basename(chainPath)
            vars._description = 'FILE: '+baseName
            vars._chain_cwd = util.addTrailingSlash(dirName)
            vars._init_cwd = util.addTrailingSlash(process.cwd())
            runRootChain(chainObj, ins, vars, finalCallback)
        }
        else{
            util.parseJsonOrYaml(chain, function(error, chainObj){
                if(!error){
                    vars._description = 'SCRIPT: ' + util.sliceString(chain, 50)
                    runRootChain(chainObj, ins, vars, finalCallback)
                }
                else{
                    console.error(error)
                }
            })
        }
    })
}

// run([chain-directory], <chain>, [parameters], [callback])
function run(...args){
    // get the callback
    let callback = null
    if(util.isFunction(args[args.length-1])){
        callback = args.pop()
    }
    // get the chain
    let chain = args.shift()
    if(chain.substring(chain.length-1) == '/' && args.length){
        // chain is directory, combine it with the next argument
        chain += args.shift()
    }
    executeChain(chain, args, {}, callback)
}

// load([module-directory], <module>, [function])
function load(...args){
    // get the module
    let moduleName = args.shift()
    if(moduleName.substring(moduleName.length-1) == '/' && args.length){
        // moduleName is directory, combine it with the next argument
        moduleName += args.shift()
    }
    let moduleObj = require(moduleName)
    if(args.length){
        let packagePartList = args.shift().split('.')
        for(let packagePart of packagePartList){
            moduleObj = moduleObj[packagePart]
        }
    }
    return moduleObj
}
