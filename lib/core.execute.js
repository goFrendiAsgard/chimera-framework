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
    'out' : '_ans',
    'ins' : [],
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


function setVar(key, value){
    key = getVarKey(key)
    try{
        if(util.isNullOrUndefined(value)){
            // if value is null, delete it
            eval('delete VARS.'+key)
        }
        else{
            // if the value is string, try to evaluate
            if(util.isString(value)){
                try{value = eval(value)}
                catch(error){}
            }
            eval('VARS.'+key+' = value')
        }
    }
    catch(error){
        VARS._error = true
        VARS._error_message = 'Cannot assign '+value+' to variable '+key+': '+error.message 
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
    try{
        for(let word of words){
            let {word} = VARS
        }
        return eval(condition)
    }
    catch(error){
        return false
    }
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
    return objChain
}

function getTrueChain(chain, dontTrim = false){
    let objChain = getNormalChain(chain)
    let isSingle
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

function getTrueRootChain(chain, ins=[], vars={}){
    let processedChain = getTrueChain(chain, true)
    setVar('_description', processedChain.description)
    setVar('_verbose', processedChain.verbose)
    // set vars
    for(key in vars){
        setVar(key, vars[key])
    }
    // set ins
    for(let i=0; i<ins.length; i++){
        if(i<processedChain.ins){
            let key = processedChain.ins[i]
            setVar(key, ins[i])
        }
    }
    // return the chain
    return {
        'ins' : util.deepCopy(processedChain.ins),
        'out' : util.deepCopy(processedChain.out),
        'mode' : 'series',
        'chains': [patchAndTrimObjChain(processedChain)],
    }
}

function createSingleChainRunner(chain, finalCallback){
    return (callback) => {
        let actions = []
        console.error(chain)
        console.error(chain.if)
        console.error(checkCondition(chain.if))
        // chain.if and chain.else are checked outside the actions, because the actions should still run even after condition state changed
        if(checkCondition(chain.if)){
            // if chainRunner
            actions.push((next)=>{
                for(let i=0; i<chain.ins; i++){
                    args.push(chain.ins[i])
                }
                console.error(args)
                try{
                    chain.command.apply(args, (error, result)=>{
                        if(error){
                            finalCallback(error, null)
                        }
                        else{
                            setVar(chain.out, result)
                            next()
                        }
                    })
                }
                catch(error){
                    finalCallback(error, null)
                }
            })
        }
        else if('else' in chain){
            // else chainRunner
            actions.push(createChainRunner(chain, finalCallback))
        }
        // error checker
        if(getVar('_error')){
            finalCallback(new Error(getVar('_error_message'), null))
        }
        // while chainRunner 
        actions.push((next)=>{
            if(checkCondition(chain.while)){
                let chainRunner = createChainRunner(chain, finalCallback)
                asyncWorker(actions, next)
            }
            else{
                next()
            }
        })
        async.series(actions, callback)
    }
}

function createNestedChainRunner(chain, finalCallback){
    let asyncWorker = chain.mode == 'series'? async.series: async.parallel
    console.error('debug nested')
    console.error(chain)
    return (callback) => {
        let actions = []
        // chain.if and chain.else are checked outside the actions, because the actions should still run even after condition state changed
        if(checkCondition(chain.if)){
            // if chainRunner
            for(subChain in chain.chains){
                // if condition fulfilled
                actions.push((next)=>{
                    let chainRunner = createChainRunner(subChain, finalCallback)
                    chainRunner(next)
                })
            }
        }
        else if('else' in chain){
            // else chainRunner
            actions.push(createChainRunner(chain, finalCallback))
        }
        // error checker
        actions.push((next) => {
            if(getVar('_error')){
                finalCallback(new Error(getVar('_error_message'), null))
            }
            else{
                next()
            }
        })
        // while chainRunner 
        actions.push((next)=>{
            if(checkCondition(chain.while)){
                let chainRunner = createChainRunner(chain, finalCallback)
                asyncWorker(actions, next)
            }
            else{
                next()
            }
        })
        console.log(actions)
        asyncWorker(actions, callback)
    }
}

function createChainRunner(chain, finalCallback){
    console.error(chain)
    if('chains' in chain && util.isArray(chain.chains)){
        console.error('debug a')
        return createNestedChainRunner(chain, finalCallback)
    }
    else if('command' in chain){
        console.error('debug b')
        return createSingleChainRunner(chain, finalCallback)
    }
    console.error('debug c')
    return (callback) => {callback()}
}

function runRootChain(chain, ins, vars, finalCallback){
    chain = getTrueRootChain(chain, ins, vars)
    if(util.isNullOrUndefined(finalCallback)){
        finalCallback = DEFAULT_FINAL_ACTION
    }
    let chainRunner = createChainRunner(chain, finalCallback)
    async.series([chainRunner], finalCallback)
}

function showObject(variables){
    let coreutil = require('util')
    console.log(coreutil.inspect(variables, false, null))
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
                    '(i) -> (x)=>{return x+1;} -> i',
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
    //showObject(trueChain)

    runRootChain(trueChain, [[4,5,1,2,3]])
}
