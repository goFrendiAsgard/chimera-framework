#! /usr/bin/env node
'use strict';

// imports
let async = require('async')
let fs = require('fs')
let yaml = require('js-yaml')
let cmd = require('./cmd.js') 
let util = require('./util.js') 

// Stringify JSON and dealing with circular-reference
let stringify = require('json-stringify-safe')

/**
 * Preprocess dirPath by adding '/' at the end of dirPath
 * Example:
 *  preprocessDirPath('dir/anotherDir')
 *  preprocessDirPath('dir/anotherDir/')
 * Output:
 *  'dir/anotherDir/'
 *
 * @param {string} dirPath
 */
function preprocessDirPath(dirPath){
    if(dirPath.substring(dirPath.length-1) != '/'){
        return dirPath + '/'
    }
    return dirPath
}

/**
 * Preprocess ins's shorthand
 * Example:
 *  preprocessIns('a, b')
 * Output:
 *  ['a', 'b']
 *
 * @param {object} ins
 */
function preprocessIns(chain){
    if('ins' in chain){
        let ins = chain.ins
        if(typeof(ins) === 'string'){
            // remove spaces
            ins = ins.trim()
            // remove parantheses
            ins = ins.replace(/^\((.*)\)/, '$1')
            // split
            ins = smartSplit(ins, ',')
            //ins = ins.split(',')
            let newIns = []
            ins.forEach(function(input){
                // remove spaces for each component
                newIns.push(input.trim())
            })
            chain.ins = newIns
        }
    }
    return chain
}

function preprocessCommand(chain){
    if('command' in chain){
        // split command by '->'
        let commandParts = smartSplit(chain.command, '-->')
        if(commandParts.length == 2){
            chain.ins = commandParts[0]
            chain.out = commandParts[1]
            chain.command = ''
        }
        else{
            commandParts = smartSplit(chain.command, '->')
            for(let i =0; i<commandParts.length; i++){
                commandParts[i] = unquote(commandParts[i].trim())
            }
            // if commandParts has 3 elements, then they must be input, process and output
            if(commandParts.length == 3){
                chain.ins = commandParts[0]
                chain.command = commandParts[1]
                chain.out = commandParts[2]
            }
            else if(commandParts.length == 2){
                if(commandParts[0].match(/^\(.*\)$/g)){
                    // input and process
                    chain.ins = commandParts[0]
                    chain.command = commandParts[1]
                }
                else{
                    // process and output
                    chain.command = commandParts[0]
                    chain.out = commandParts[1]
                }
            }
        }
        // if chain is empty, then copy ins into output
        if(chain.command == ''){
            // if only single argument is present, then return it, otherwise combine the arguments as array
            chain.command = '(...args)=>{if(args.length==1){return args[0];}else{return args;}}';
        }
    }
    return chain
}

/**
 * Preprocess chain's shorthand.
 * Example:
 *  preprocessChain({'series' : ['python add.py 5 6']})
 * Output:
 *  {'mode' : 'series', 'chains' : ['python add py 5 6']}
 *
 * @param {object} chain
 */
function preprocessChain(chain, isRoot){
    // if chain is a string, cast it into object
    if(chain == null){
        chain = ''
    }
    if(util.isString(chain)){
        chain = {'command' : chain}
    }
    // other process require chain to be object
    if(util.isRealObject(chain)){
        // adjust keys
        chain = util.replaceKey(chain, 'process', 'command')
        chain = util.replaceKey(chain, 'input', 'ins')
        chain = util.replaceKey(chain, 'inputs', 'ins')
        chain = util.replaceKey(chain, 'output', 'out')
        chain = util.replaceKey(chain, 'outs', 'out')
        chain = util.replaceKey(chain, 'outputs', 'out')
        // preprocess input and command
        chain = preprocessCommand(chain)
        chain = preprocessIns(chain)
        // default values
        chain = util.assignDefaultValue(chain, 'out', '_ans')
        chain = util.assignDefaultValue(chain, 'ins', [])
        chain = util.assignDefaultValue(chain, 'mode', 'series')
        chain = util.assignDefaultValue(chain, 'if', true)
        chain = util.assignDefaultValue(chain, 'while', true)
        if(isRoot){
            chain = util.assignDefaultValue(chain, 'verbose', false)
            chain = util.assignDefaultValue(chain, 'varse', {})
            // The root can contains only a single command (no "chains" or "mode")
            if ('command' in chain){
                chain.mode = 'series'
                chain.chains = [{'command': chain.command, 'ins':chain.ins, 'out':chain.out}]
                delete chain.command
            }
        }
        // preprocess 'series' shorthand
        if('series' in chain){
            chain.mode = 'series'
            chain = util.replaceKey(chain, 'series', 'chains')
        }
        // preprocess 'parallel' shorthand
        if('parallel' in chain){
            chain.mode = 'parallel'
            chain = util.replaceKey(chain, 'parallel', 'chains')
        }
        // preprocess 'error'
        if('error' in chain && (('mode' in chain && 'chains' in chain) || 'command' in chain)){
            let subChain = {}
            if('mode' in chain && 'chains' in chain){
                subChain.mode = chain.mode
                subChain.chains = chain.chains
                delete chain.mode
                delete chain.chains
            }
            else if('command' in chain){
                subChain.mode = 'series'
                subChain.command = chain.command
                delete chain.command
            }
            chain.mode = 'series'
            // create last chain
            let lastChain = {'if': chain.error, 'mode': 'series', 'chains' : []}
            if('error_message' in chain){
                lastChain.chains.push('('+stringify(chain.error_message)+')->->_error_message')
            }
            if('error_actions' in chain){
                for(let i=0; i<chain.error_actions.length; i++){
                    let action = chain.error_actions[i]
                    lastChain.chains.push(action)
                }
            }
            lastChain.chains.push('("true")->->_error')
            chain.chains = [subChain, lastChain]
        }
        // recursive preprocessing
        if('chains' in chain){
            for(let i=0; i<chain.chains.length; i++){
                chain.chains[i] = preprocessChain(chain.chains[i], false)
            }
        }
        // for root, move chain to lower level
        if(isRoot){
            // define subchain
            let subChain = {}
            if ('chains' in chain){
                subChain = {'chains' : chain.chains}
            }
            else if('command' in chain){
                subChain = {'command': chain.command}
                delete chain.command
            }
            // adjust the keys
            let keys = ['mode', 'if', 'while']
            keys.forEach(function(key){
                if(key in chain){
                    subChain[key] = chain[key]
                }
                if(key != 'mode'){
                    delete(chain[key])
                }
            })
            chain.chains = [subChain]
        }
        // return chain
        return chain
    }
    return false
}


function trimProcessName(processName){
    if(processName.length > 100){
        return processName.substring(0,96) + '...'
    }
    return processName
}


/**
 * Show current time in nano second, and return it
 * Example:
 *  startTime = showStartTime('myProcess')
 */
function showStartTime(processName, chainOptions){
    let trimmedProcessName = trimProcessName(processName)
    let startTime = process.hrtime();
    if(chainOptions.description != ''){
        console.warn('[INFO] ' + String(chainOptions.description))
    }
    console.warn('[INFO] PROCESS NAME : ' + processName)
    console.warn('[INFO] START PROCESS  ' + trimmedProcessName + ' AT    : ' + util.formatNanoSecond(startTime))
    return startTime
}

/**
 * Show current time in nano second, and calculate difference from startTime
 * Example:
 *  showEndTime('myProcess', startTime)
 */
function showEndTime(processName, startTime){
    processName = trimProcessName(processName)
    let diff = process.hrtime(startTime);
    let endTime = process.hrtime();
    console.warn('[INFO] END PROCESS    '+processName+' AT    : ' + util.formatNanoSecond(endTime))
    console.warn('[INFO] PROCESS        '+processName+' TAKES : ' + util.formatNanoSecond(diff) + ' NS')
}

function showKeyVal(vars, spaces){
    Object.keys(vars).forEach(function(key){
        let strVal = stringify(vars[key])
        if(strVal.length <= 250 || typeof(vars[key]) == 'string' || vars[key] instanceof String){
            console.warn(spaces + key + ' : ' + strVal)
        }
        else{
            console.warn(spaces + key + ' :')
            showKeyVal(vars[key], spaces + '  ')
        }
    })
}

function showVars(processName, vars){
    processName = trimProcessName(processName)
    console.warn('[INFO] STATE AFTER    '+processName+' : ')
    showKeyVal(vars, '        ')
}

function showFailure(processName){
    processName = trimProcessName(processName)
    console.error('[ERROR] FAILED TO PROCESS   ['+processName+']')
}


function processModule(moduleName, inputs, cwd, callback){
    // ensure cwd ended up with "/"
    cwd = preprocessDirPath(cwd)
    // get real moduleName
    let moduleNameParts = smartSplit(moduleName, ' ')
    for(let i=0; i<moduleNameParts.length; i++){
        moduleNameParts[i] = unquote(moduleNameParts[i])
    }
    moduleName = moduleNameParts[0]
    let m
    try{
        m = require(moduleName)
    }
    catch(error){
        m = require(cwd + moduleName)
    }
    // determine runner
    let runner
    if(m != null && typeof(m) != 'undefined'){
        if(moduleNameParts.length == 1){
            runner = m
        }
        else{
            let runnerParts = moduleNameParts.slice(1)
            let runnerName = runnerParts.join(' ')
            let runnerNameParts = runnerName.split('.')
            runner = m
            for(let i=0; i<runnerNameParts.length; i++){
                runner = runner[runnerNameParts[i]]
            }
        }
    }
    if(runner == null || typeof(runner) == 'undefined'){
        // if cannot find runner, ditch it
        console.error('[ERROR] Cannot get executable function from: ' + moduleName)
        callback('', false, 'Cannot get executable function from: ' + moduleName)
    }
    else{
        // add callback as input argument
        let args = inputs
        args.push(callback)
        // run runner with arguments inside cwd
        runner.apply(runner, args)
    }
}

/**
 * Execute chain configuration
 * Example
 *  var chainConfig = {
 *      'series' : {'command': 'python operation.py', 'ins': ['a, 'b', 'operation'], 'out': 'c'},
 *      'ins':['a','b'],
 *      'out':'c'};
 *  execute(chainConfig, [5 6], {'operation' : 'plus'}, function(result, success, errorMessage){console.log(out);});
 *  execute(chainConfig, [5 6], {'operation' : 'plus'});
 *  execute(chainConfig, [5 6]);
 *  execute(chainConfig);
 *
 * @params {object} chainConfig
 * @params {array} argv
 * @params {object} presets
 * @params {function} executeCallback
 */
function execute(chainConfigs, argv, presets, executeCallback, chainOptions){
    // argv should be array or object
    if(typeof(argv) != 'object'){
        argv = []
    }
    // preprocessing
    chainConfigs = preprocessChain(chainConfigs, true)
    // don't do anything if chainConfigs is wrong
    if(chainConfigs === false){
        console.error('[ERROR] Unable to fetch chain')
        executeCallback('', false, 'Unable to fetch chain')
        return null
    }
    // get ins, out, vars, chains, mode, and verbose
    let ins     =  chainConfigs.ins
    let out     =  chainConfigs.out
    let vars    =  chainConfigs.vars
    let chains  =  chainConfigs.chains
    let mode    =  chainConfigs.mode
    let verbose =  chainConfigs.verbose
    // override vars with presets
    if(typeof presets == 'object'){
        Object.keys(presets).forEach(function(key){
            vars[key] = presets[key]
        })
    }
    // populate "vars" with "ins" and "process.argv"
    ins.forEach(function(key, index){
        if(index < argv.length){
            setVar(key, argv[index])
        }
        else if(!(key in vars)){
            setVar(key, 0)
        }
    })
    // add "out" to "vars"
    if(!(out in vars)){
        setVar(out, '')
    }
    // add "cwd"
    setVar('_chain_cwd', preprocessDirPath(chainOptions.cwd))
    setVar('_init_cwd', preprocessDirPath(process.cwd()))
    // run the chains
    try{
        runChains(chains, mode, true)
    }
    catch(e){
        console.error('[ERROR] Chain execution failed')
        console.error(e.stack)
        executeCallback('', false, e.stack)
        return null
    }

    // The sub functions ================================================

    // function to run executeCallback or show the result
    function lastProcessOutput(err, result){
        let output = out in vars? vars[out]: ''
        // execute the callback if defined, or show the output
        if(typeof(executeCallback) === 'function'){
            executeCallback(output, true, '')
        }
        else{
            console.log(output)
        }
    }

    function getVar(key){
        let keyParts = key.split('.')
        // bypass everything if the key is not nested
        if(keyParts.length == 1){
            return key in vars? vars[key]: 0
        }
        // recursively get value of vars
        let value = vars
        for(let i=0; i<keyParts.length; i++){
            let keyPart = keyParts[i]
            if((typeof value == 'object') && (keyPart in value)){
                value = value[keyPart]
            }
            else{
                value = 0
                break
            }
        }
        return value
    }

    function setVar(key, value){
        if(typeof value == 'string'){
            // remove trailing new lines or trailing spaces
            value = value.replace(/[ \n]+$/g, '')
            // If the value can be parsed into object, parse it
            try{
                value = JSON.parse(value);
            } catch(e){}
        }
        let keyParts = key.split('.')
        // bypass everything if the key is not nested
        if(keyParts.length == 1){
            vars[key] = value
        }
        // recursively set value of vars
        let obj = vars
        for(let i=0; i<keyParts.length; i++){
            let keyPart = keyParts[i]
            // last part
            if(i == keyParts.length -1){
                obj[keyPart] = value
            }
            // middle part
            else{
                // define object if not defined
                if(!('keypart') in obj || typeof obj[keyPart] != 'object'){
                    obj[keyPart] = {}
                }
                // Traverse. Javacript has "call by reference" !!!
                obj = obj[keyPart]
            }
        }
    }

    function getTrueChainRunner(chain){
        return function(callback){
            // get command, ins, and out
            let chainCommand = chain.command
            let chainIns = chain.ins
            let chainOut = chain.out
            let parameters = []
            // we can only send string in CLI, thus if the input is object,
            // it should be stringified
            chainIns.forEach(function(key){
                let arg = 0
                if(key.match(/^"(.*)"$/g) || key.match(/^'(.*)'$/g)){
                    arg = unquote(key)
                    // literal, remove quotes
                    try{
                        arg = JSON.parse(arg)
                    }
                    catch(err){
                        arg = JSON.parse(stringify(arg))
                    }
                }
                else{
                    // non literal, get variable
                    arg = getVar(key)
                }
                // determine whether we need to add quote
                let addQuote = false
                if(chainCommand.match(/^\[.*\]$/g)){
                    // if it is module, don't add quote
                    addQuote = false
                }
                else if(chainCommand.match(/.*=>.*/g)){
                    // if it is javascript arrow function and the arg is not json qualified, we also need to add quote
                    arg = stringify(arg)
                    try{
                        let tmp = JSON.parse(arg)
                    }
                    catch(err){
                        addQuote = true
                    }
                }
                else{
                    // if it is not javascript, we need to add quote, except it is already quoted
                    arg = stringify(arg)
                    if(!arg.match(/^"(.*)"$/g) && !arg.match(/^'(.*)'$/g)){
                        addQuote = true
                    }
                }
                // add quote if necessary
                if(addQuote){
                    arg = quote(arg)
                }
                parameters.push(arg)
            })
            let startTime = 0
            if(chainCommand.match(/^\[.*\]$/g)){
                let moduleName = chainCommand.substring(1, chainCommand.length-1)
                let logCommand = 'processModule('+stringify(moduleName)+', '+stringify(parameters)+', '+stringify(chainOptions.cwd)+', callback)'
                // if chainCommand is module, we use processModule
                if(verbose){
                    startTime = showStartTime(logCommand, chainOptions)
                }
                try{
                    processModule(moduleName, parameters, chainOptions.cwd, function(output, success, errorMessage){
                        // set defaulut output, success, and errorMessage
                        if(typeof output == 'undefined'){ output = 0; }
                        if(typeof success == 'undefined'){ success = true; }
                        if(typeof errorMessage == 'undefined'){ errorMessage = ''; }
                        // set variable
                        setVar(chainOut, output)
                        if(verbose){
                            showEndTime(moduleName, startTime)
                            showVars(moduleName, vars)
                        }
                        // if error, just stop the chain, and call the last callback
                        if(getVar('_error') == true || !success){
                            if(getVar('_error') == true){
                                errorMessage = getVar('_error_message')
                            }
                            console.error('[ERROR] ERROR CONDITION DETECTED : _err=true')
                            console.error('[ERROR] ERROR MESSAGE : ' + errorMessage)
                            console.error('[ERROR] MODULE : ' + moduleName)
                            executeCallback('', false, errorMessage)
                        }
                        else{
                            // continue the chain
                            callback()
                        }
                    })
                }catch(e){
                    showFailure(logCommand)
                    console.error(e.stack)
                    console.error('[ERROR] SCRIPT : ' + logCommand)
                    executeCallback('', false, e.stack)
                }
            }
            else if(chainCommand.match(/.*=>.*/g)){
                // if chainCommand is purely javascript's arrow function, we can simply use eval
                let jsScript = '(' + chainCommand + ')(' + parameters.join(', ') + ')'
                if(verbose){
                    startTime = showStartTime(jsScript, chainOptions)
                }
                try{
                    let output = eval(jsScript)
                    // assign as output
                    setVar(chainOut, output)
                    if(verbose){
                        showEndTime(jsScript, startTime)
                        showVars(jsScript, vars)
                    }
                    // if error, just stop the chain, and call the last callback
                    if(getVar('_error')){
                        let errorMessage = getVar('_error_message')
                        if(errorMessage == 0){
                            errorMessage = 'Chain execution stopped'
                        }
                        console.error('[ERROR] ERROR CONDITION DETECTED : _err=true')
                        console.error('[ERROR] ERROR MESSAGE : ' + errorMessage)
                        console.error('[ERROR] SCRIPT : ' + jsScript)
                        executeCallback('', false, errorMessage)
                    }
                    else{
                        // continue the chain
                        callback()
                    }
                }
                catch(e){
                    showFailure(jsScript)
                    console.error(e.stack)
                    console.error('[ERROR] SCRIPT : ' + jsScript)
                    executeCallback('', false, e.stack)
                }
            }
            else{
                // if chainCommand is really external command, so we should use cmd.get
                // add parameter to chainCommand
                let cmdCommand = chainCommand + ' ' + parameters.join(' ')
                // benchmarking
                if(verbose){
                    startTime = showStartTime(cmdCommand, chainOptions)
                }
                // run the command
                try{
                    cmd.get(cmdCommand, {'cwd': chainOptions.cwd}, function(err, stdout, stderr){
                        // it might be no error, but stderr exists
                        if(stderr != ''){
                            console.warn(stderr)
                        }
                        // run callback
                        if(!err){
                            // assign as output
                            setVar(chainOut, stdout)
                            if(verbose){
                                showEndTime(cmdCommand, startTime)
                                showVars(cmdCommand, vars)
                            }
                            // if error, just stop the chain, and call the last callback
                            if(getVar('_error')){
                                let errorMessage = getVar('_error_message')
                                if(errorMessage == 0){
                                    errorMessage = 'Chain execution stopped'
                                }
                                console.error('[ERROR] ERROR CONDITION DETECTED : _err=true')
                                console.error('[ERROR] ERROR MESSAGE : ' + errorMessage)
                                console.error('[ERROR] COMMAND : ' + cmdCommand)
                                console.error(errorMessage)
                                executeCallback('', false, errorMessage)
                            }
                            else{
                                // continue the chain
                                callback()
                            }
                        }
                        else{
                            showFailure(cmdCommand)
                            console.error('[ERROR] COMMAND : ' + cmdCommand)
                            console.error(err)
                            executeCallback('', false, err)
                        }
                    })
                }
                catch(e){
                    showFailure(cmdCommand)
                    console.error(e.stack)
                    executeCallback('', false, e.stack)
                }
            }
        }
    }

    // function to build another another function
    // the function returned will execute a single chain
    function getChainRunner(chain){
        if('chains' in chain){
            // chain has other subChains
            let subMode = 'mode' in chain? chain.mode: 'series'
            let subChains = 'chains' in chain? chain.chains: []
            return function(callback){
                runChains(subChains, subMode, false, callback)
            }
        }
        else if('command' in chain){
            // chain doesn't have subChains
            return getTrueChainRunner(chain)
        }
        return null
    }

    function isTrue(statement){
        let truth = false
        let script = ''
        try{
            statement = String(statement)
            let re = /([a-zA-Z0-9-_]*)/g
            let words = statement.match(re).filter((value, index, self) =>{
                return self.indexOf(value) === index
            })
            // build script. We need anonymous function for sandboxing
            script += '(function(){'
            for(let i=0; i<words.length; i++){
                let word = words[i]
                if(word in vars){
                    script += 'let ' + word + '=' + stringify(getVar(word)) + ';'
                }
            }
            script += 'return ' + statement + ';})()'
            // execute script
            truth = eval(script)
        }
        catch(error){
            console.error('[ERROR] Failed to evaluate condition')
            console.error(script)
            console.error(error.stack)
        }
        return truth
    }

    // get actions that will be used in async process
    function getActions(chains){
        let actions = []
        chains.forEach(function(chain){
            // only proceed if "chain.if" is true
            if(isTrue(chain.if)){
                let chainRunner = getChainRunner(chain)
                if(chainRunner != null){
                    // need a flag so that the chainRunner will be executed at at least once
                    let firstRun = true
                    let alteredChainRunner = function(callback){
                        // if "chain.while" is true or this is the first run,
                        // then call this chainRunner one more time (recursive strategy)
                        if(isTrue(chain.while) || firstRun){
                            let alteredCallback = function(){
                                firstRun = false
                                alteredChainRunner(callback)
                            }
                            chainRunner(alteredCallback)
                        }
                        // otherwise just execute the callback
                        else{
                            callback()
                        }
                    }
                    // add to actions
                    actions.push(alteredChainRunner)
                }
            }
        })
        return actions
    }

    // run async process
    function runChains(chains, mode, isCoreProcess, runCallback){
        // populate actions
        let actions = getActions(chains)
        // run actions
        if(mode == 'series'){
            // series
            if(isCoreProcess){
                async.series(actions, lastProcessOutput)
            }
            else{
                async.series(actions, runCallback)
            }
        }
        else if(mode == 'parallel'){
            // parallel
            if(isCoreProcess){
                async.parallel(actions, lastProcessOutput)
            }
            else{
                async.parallel(actions, runCallback)
            }
        }
    }

}

/**
 * Execute chain file
 * Example
 *  executeChain('myChain.yaml', [5 6], {'operation' : 'plus'}, function(result, success){console.log(out);});
 *  executeChain('myChain.yaml', [5 6], {'operation' : 'plus'});
 *  executeChain('myChain.yaml', [5 6]);
 *  executeChain('myChain.yaml');
 *
 * @params {string} chain
 * @params {array} argv
 * @params {object} presets
 * @params {function} executeCallback
 */

function executeChain(chain, argv, presets, executeCallback){
    if(typeof(argv) == 'function'){
        executeCallback = argv
        argv = []
        presets = {}
    }
    else if(typeof(presets) == 'function'){
        executeCallback = presets
        if(Array.isArray(argv)){
            presets = {}
        }
        else{
            presets = argv
            argv = []
        }
    }
    fs.readFile(chain, function(err, data){
        let chainString = ''
        let chainOptions = {'cwd' : process.cwd(), 'description' : 'No description available'}
        if(!err){
            // chain is really a file
            let yamlParts = chain.split('/')
            if(yamlParts.length > 1){
                // perform chdir if necessary
                let pathParts = yamlParts.slice(0,-1)
                let yamlPath = pathParts.join('/')
                chainOptions.cwd = preprocessDirPath(path.resolve(yamlPath))
            }
            chainString = data
            chainOptions.description = 'CHAIN FILE   : ' + chain
        }
        else{
            // chain is actualy a string, not a file
            chainString = chain
            chainOptions.description = 'CHAIN SCRIPT : ' + chain
        }
        // get chainConfigs
        let chainConfigs = {}
        try{
            chainConfigs = yaml.safeLoad(chainString)
        }
        catch(yamlError){
            try{
                chainConfigs = JSON.parse(chainString)
            }
            catch(jsonError){
                console.warn('[ERROR] Not a valid YAML or JSON format')
                console.warn('\nString:')
                console.warn(String(chainString))
                console.warn('\nYAML Error:')
                console.warn(yamlError.stack)
                console.warn('\nJSON Error:')
                console.warn(jsonError.stack)
                return null
            }
        }
        // ensure we going back to this directory
        let alteredCallback = function(result, success, errorMessage){
            // execute callback
            if(typeof(executeCallback) === 'function'){
                executeCallback(result, success, errorMessage)
            }
            else if(success){
                // Object should be shown as json
                if(typeof result == 'object'){
                    console.log(stringify(result))
                }
                else{
                    console.log(result)
                }
            }
        }
        execute(chainConfigs, argv, presets, alteredCallback, chainOptions)
    })
}

function sprout(...args){
    let chain, argvStartIndex
    let argv = []
    let callback = null
    // get chain and argvStartIndex
    if(args.length > 1 && args[0].substring(args[0].length-1) == '/'){
        chain = args[0] + args[1]
        argvStartIndex = 2
    }
    else{
        chain = args[0]
        argvStartIndex = 1
    }
    // get argv
    let index = argvStartIndex
    while(index < args.length){
        if(typeof(args[index]) != 'function'){
            argv.push(args[index])
        }
        else{
            callback = args[index]
            break
        }
        index++
    }
    // callback
    if(callback === null){
        callback = function(output, success, errorMessage){
            if(success){
                console.log(output)
            }
            else{
                console.error(errorMessage)
            }
        }
    }
    executeChain(chain, argv, callback)
}
