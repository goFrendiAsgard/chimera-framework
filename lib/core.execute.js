#! /usr/bin/env node
'use strict';

// imports
let async = require('neo-async')
let fs = require('fs')
let yaml = require('js-yaml')
let stringify = require('json-stringify-safe')
let cmd = require('./cmd.js')
let util = require('./util.js')
let path = require('path')

const $ = require('chimera-framework')

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
    'original_command' : null,
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
    callback(null, args)
}

const CMD_EXECUTOR = (...args) => {
    let callback = args.pop(callback)
    let command = args.unshift(args)
    for(inputKey of args){
        command += ' ' + util.quote(getVars(inputKey))
    }
    cmd.get(command, callback)
}

const DEFAULT_FINAL_ACTION = (error, result)=>{
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

// initial value of VARS
var VARS = {
    '_ans' : '',
    '_error' : false,
    '_error_message' : '',
    '_init_cwd' : process.cwd(),
    '_chain_cwd' : process.cwd(),
    '_verbose' : false,
    '_description' : '',
    '$' : $ 
}

var FINAL_ACTION = DEFAULT_FINAL_ACTION

var CHAIN_ID = 1

function setVar(key, value){
    key = getVarKey(key)
    try{
        if(util.isNullOrUndefined(value)){
            // if value is null, delete it
            console.error('[INFO] Delete variable '+key)
            eval('delete VARS.'+key)
        }
        else{
            // if the value is string, try to evaluate
            if(util.isString(value)){
                try{
                    value = eval(value)
                    console.error('[INFO] Getting parsed value '+JSON.stringify(value))
                }
                catch(error){}
            }
            console.error('[INFO] Assign value '+JSON.stringify(value)+' to variable '+key)
            eval('VARS.'+key+' = value')
        }
    }
    catch(error){
        console.error('[INFO] Cannot assign value '+JSON.stringify(value)+' to variable '+key)
        console.error(error)
        VARS._error = true
        VARS._error_message = 'Cannot assign '+JSON.stringify(value)+' to variable '+key+': '+error.message 
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

function getVar(key){
    // if key is "null", "none", "true", "false", or numbers then return it
    if(key.match(NULL_PATTERN) || key.match(NONE_PATTERN)){
        return null
    }
    else if(key.match(TRUE_PATTERN)){
        return true
    }
    else if(key.match(FALSE_PATTERN)){
        return false
    }
    else if(key.match(NUMBER_PATTERN)){
        return parseFloat(key)
    }
    // otherwise, try to get variable from VARS
    try{
        let varKey = getVarKey(key)
        return eval('VARS.'+varKey)
    }
    catch(getVarError){
        try{
            return eval(key)
        }
        catch(getLiteralError){
            return null
        }
    }
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
        console.error('[INFO] Processing string condition: ' + condition)
        try{
            let script = 'function(){'
            for(let word in VARS){
                eval('let '+word+' = VARS.'+word+';')
            }
            script += 'return ('+condition+')'
            script += '}()'
            let result = eval(script)
            console.error('[INFO] Checking condition result: ' + condition)
            return result 
        }
        catch(error){
            console.error('[INFO] Set checking condition result to false due to evalution error')
            console.error(error)
            return false
        }
    }
    console.error('[INFO] Checking condition result: ' + JSON.stringify(condition))
    return condition
}

function getChainFromLongArrow(str){
    let chainShard = util.smartSplit(str, LONG_ARROW)
    if(chainShard.length >= 2){
        // LONG ARROW: ins --> out
        return {'ins': chainShard[0], 'out':chainShard[1], 'command':''}
    }
    return null
}


function getChainFromShortArrow(str){
    let chainShard = util.smartSplit(str, SHORT_ARROW)
    if(chainShard.length >= 3){
        // SHORT ARROW COMPLETE FORM: (ins) -> command -> out
        return {'ins':chainShard[0], 'command':chainShard[1], 'out':chainShard[2]}
    }
    else if(chainShard.length >= 2){
        if(chainShard[0].match(MATCH_INSIDE_PARANTHESES_PATTERN)){
            // SHORT ARROW : (ins) -> command 
            return {'ins':chainShard[0], 'command':chainShard[1], 'out':'_ans'}
        }
        // SHORT ARROW : command -> out
        return {'ins':[], 'command':chainShard[0], 'out':chainShard[1]}
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
        if('command' in chain && !('ins' in chain) && !('out' in chain)){
            let originalCommand = chain.command
            let pseudoChain = getNormalChain(originalCommand)
            chain = util.patchObject(chain, pseudoChain)
            chain.original_command = originalCommand 
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

function getNormalCommand(command){
    if(util.isString(command)){
        let matchCallback = command.match(MATCH_INSIDE_CALLBACK_WRAPPER)
        let matchPromise = command.match(MATCH_INSIDE_PROMISE_WRAPPER)
        if(matchCallback || matchPromise){
            command = command.substring(1, command.length -1)
            try{
                if(matchCallback){
                    // match callback
                    return callbackify(eval(command), OPT_CALLBACK)
                }
                else{
                    // match promise
                    return callbackify(eval(command), OPT_PROMISE)
                }
            }
            catch(error){
                VARS._error = true
                VARS._error_message = error.message
            }
        }
        else if(command != ''){
            try{
                // match 
                return callbackify(eval(command), OPT_NORMAL)
            }
            catch(error){
                // command runner
                return (...args) => {
                    // add command as argument
                    args.shift(command)
                    CMD_EXECUTOR.apply(CMD_EXECUTOR, args)
                }
            }
        }
        else{
            // default command: pack arguments 
            return ASSIGN
        }
    }
    return command
}

function patchAndTrimObjChain(objChain, isSingle){
    // objChain
    objChain = util.patchObject(DEFAULT_CHAIN, objChain)
    // delete unused properties
    if(isSingle){
        delete objChain.mode
        delete objChain.series
        delete objChain.parallel
        delete objChain.chains
    }
    else{
        delete objChain.original_command
        delete objChain.command
        delete objChain.ins
        delete objChain.out
    }
    if(util.isNullOrUndefined(objChain.chains)){
        delete objChain.else
    }
    objChain.id = CHAIN_ID++
    return objChain
}

function getTrueChain(chain, dontTrim = false){
    let objChain = getNormalChain(chain)
    let isSingle
    objChain = util.replaceKey(objChain, KEY_SYNONIM)
    objChain.ins = getNormalIns(objChain.ins)
    // preprocess command and chains
    if('command' in objChain){
        if(!('original_ccommand' in objChain)){
            objChain.original_command = objChain.command
        }
        objChain.command = getNormalCommand(objChain.command)
        isSingle = true
    }
    else if('parallel' in objChain || 'series' in objChain || 'chains' in objChain){
        isSingle = false
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
    if(dontTrim){
        return objChain
    }
    return patchAndTrimObjChain(objChain, isSingle)
}

function getTrueRootChain(chain){
    let processedChain = getTrueChain(chain, true)
    // return the chain
    return {
        'id' : 0,
        'ins' : util.deepCopy(processedChain.ins),
        'out' : util.deepCopy(processedChain.out),
        'mode' : 'series',
        'if' : true,
        'chains': [patchAndTrimObjChain(processedChain)],
        'while': false,
    }
}

function createSingleChainRunner(chain, finalCallback){
    console.error('[INFO] Create single chain runner for: ' + chain.id)
    return (callback) => {
        let actions = []
        // chain.if and chain.else are checked outside the actions, because the actions should still run even after condition state changed
        if(checkCondition(chain.if)){
            console.error('[INFO] If condition resolved for: ' + chain.id)
            // if chainRunner
            actions.push((next)=>{
                // add arguments
                let args = []
                for(let i=0; i<chain.ins; i++){
                    args.push(chain.ins[i])
                }
                try{
                    console.error('[INFO] Run ' + JSON.stringify(chain.original_command) + ' with argument: '+ JSON.stringify(args))
                    // add callback to the argument
                    args.push((error, result)=>{
                        if(error){
                            finalCallback(error, null)
                        }
                        else{
                            setVar(chain.out, result)
                            next()
                        }
                    })
                    chain.command.apply(chain.command, args)
                }
                catch(error){
                    finalCallback(error, null)
                }
            })
        }
        else if('else' in chain){
            // else chainRunner
            console.error('[INFO] If condition rejected for: ' + chain.id)
            actions.push(createChainRunner(chain.else, finalCallback))
        }
        // error checker
        if(getVar('_error')){
            console.error('[INFO] Error condition resolved for: ' + chain.id)
            finalCallback(new Error(getVar('_error_message'), null))
        }
        // while chainRunner 
        actions.push((next)=>{
            if(checkCondition(chain.while)){
                console.error('[INFO] While condition resolved for: ' + chain.id)
                let chainRunner = createChainRunner(chain, finalCallback)
                asyncWorker(actions, next)
            }
            else{
                console.error('[INFO] While condition rejected for: ' + chain.id)
                next()
            }
        })
        console.error('[INFO] Run single chain: ' + chain.id)
        async.series(actions, callback)
    }
}

function createNestedChainRunner(chain, finalCallback){
    console.error('[INFO] Create nested chain runner for: ' + chain.id)
    let asyncWorker = chain.mode == 'series'? async.series: async.parallel
    return (callback) => {
        let actions = []
        // chain.if and chain.else are checked outside the actions, because the actions should still run even after condition state changed
        if(checkCondition(chain.if)){
            console.error('[INFO] If condition resolved for: ' + chain.id)
            // if chainRunner
            for(let subChain of chain.chains){
                console.error('[INFO] Find subchain of ' + chain.id +': '+subChain.id)
                // if condition resolved
                actions.push((next)=>{
                    let chainRunner = createChainRunner(subChain, finalCallback)
                    chainRunner(next)
                })
            }
        }
        else if('else' in chain){
            // else chainRunner
            console.error('[INFO] If condition rejected for: ' + chain.id)
            actions.push(createChainRunner(chain.else, finalCallback))
        }
        // error checker
        actions.push((next) => {
            if(getVar('_error')){
                console.error('[INFO] Error condition resolved for: ' + chain.id)
                finalCallback(new Error(getVar('_error_message'), null))
            }
            else{
                next()
            }
        })
        // while chainRunner 
        actions.push((next)=>{
            if(checkCondition(chain.while)){
                console.error('[INFO] While condition resolved for: ' + chain.id)
                let chainRunner = createChainRunner(chain, finalCallback)
                asyncWorker(actions, next)
            }
            else{
                console.error('[INFO] While condition rejected for: ' + chain.id)
                next()
            }
        })
        console.error('[INFO] Run nested chain: ' + chain.id)
        asyncWorker(actions, callback)
    }
}

function createChainRunner(chain, finalCallback){
    if('chains' in chain && util.isArray(chain.chains)){
        return createNestedChainRunner(chain, finalCallback)
    }
    else if('command' in chain){
        return createSingleChainRunner(chain, finalCallback)
    }
    console.error('[INFO] Create empty chain runner for: ' + chain.id)
    return (callback) => {callback()}
}

function runRootChain(chain, ins=[], vars={}, finalCallback){
    chain = getTrueRootChain(chain)
    console.error('[INFO] Root chain:')
    showObject(chain)
    if('description' in chain){
        setVar('_description', chain.description)
    }
    if('_verbose' in chain){
        setVar('_verbose', chain.verbose)
    }
    // set vars
    console.error('[INFO] Find preset variables: ' + JSON.stringify(vars))
    for(key in vars){
        setVar(key, vars[key])
    }
    // set ins
    console.error('[INFO] Find inputs: ' + JSON.stringify(ins))
    for(let i=0; i<ins.length; i++){
        if(i<chain.ins.length){
            let key = chain.ins[i]
            setVar(key, ins[i])
        }
    }
    if(util.isNullOrUndefined(finalCallback)){
        finalCallback = DEFAULT_FINAL_ACTION
    }
    console.error('[INFO] Create root chain runner')
    let chainRunner = createChainRunner(chain, finalCallback)
    console.error('[INFO] Execute root chain runner')
    async.series([chainRunner], finalCallback)
}

function showObject(variables){
    let coreutil = require('util')
    console.error(coreutil.inspect(variables, false, null))
}

if(require.main === module){

    let CHAIN_SAMPLE = {
        'ins': 'data',
        'out': 'output',
        'verbose' : true,
        'if': '$.util.isArray(data)',
        'series': [
            '0 --> i',
            '0 --> maximum',
            {
                'while': 'i < data.length',
                'series': [
                    {
                        'if' : 'i == 0 || data[i] > max',
                        'command': '(data[i]) --> max',
                    },
                    '(i) -> i + 1 -> i',
                ]
            },
            'uname -a -> uname',
            '5 -> [(s, callback)=>{callback(null, s+1);}] -> five_plus_one',
            '<new Promise(function(resolve, reject){resolve(73);})> -> sheldon_number',
            '(max, uname, five_plus_one, sheldon_number) --> output',
        ],
        'else':{
            'series': [
                '(true) --> _error',
                '("input is not array") --> _error_message'
            ]
        }
    }

    let trueChain = getTrueRootChain(CHAIN_SAMPLE)
    runRootChain(trueChain, [[4,5,1,2,3]])
}
