#! /usr/bin/env node
'use strict';

// imports
let async = require('async')
let fs = require('fs')
let yaml = require('js-yaml')
let stringify = require('json-stringify-safe')
let cmd = require('./cmd.js') 
let util = require('./util.js') 

const KEY_SYNONIM = {
    'process' : 'command',
    'input' : 'ins',
    'inputs' : 'ins',
    'output' : 'out',
    'outs' : 'out',
    'outputs' : 'out',
}

const DEFAULT_VALUE = {
    'out' : '_ans',
    'ins' : [],
    'mode' : 'series',
    'if' : true,
    'while' : true,
}

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
 *  preprocessChainIns('a, b')
 * Output:
 *  ['a', 'b']
 *
 * @param {object} ins
 */
function preprocessChainIns(chain){
    if('ins' in chain){
        let ins = chain.ins
        if(util.isString(ins)){
            // remove spaces
            ins = ins.trim()
            // remove parantheses
            ins = ins.replace(/^\((.*)\)/, '$1')
            // split
            ins = util.smartSplit(ins, ',')
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

function preprocessLongArrow(chain){
    if('command' in chain){
        let commandParts = util.smartSplit(chain.command, '-->')
        if(commandParts.length == 2){
            chain.ins = commandParts[0]
            chain.out = commandParts[1]
            chain.command = ''
        }
    }
    return chain
}

function preprocessArrow(chain){
    if('command' in chain){
        let commandParts = util.smartSplit(chain.command, '->')
        for(let i =0; i<commandParts.length; i++){
            commandParts[i] = util.unquote(commandParts[i].trim())
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
    return chain
}

function preprocessChainCommand(chain){
    chain = preprocessLongArrow(chain) 
    chain = preprocessArrow(chain)
    if('command' in chain && chain.command == ''){
        // default command: if only single argument is present, then return it, otherwise combine the arguments as array
        chain.command = '(...args)=>{if(args.length==1){return args[0];}else{return args;}}';
    }
    return chain
}

function preprocessChainError(chain){
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
            lastChain.chains.push('('+stringify(chain.error_message)+')-->_error_message')
        }
        if('error_actions' in chain){
            for(let i=0; i<chain.error_actions.length; i++){
                let action = chain.error_actions[i]
                lastChain.chains.push(action)
            }
        }
        lastChain.chains.push('("true")-->_error')
        chain.chains = [subChain, lastChain]
    }
    return chain
}

function preprocessChainMode(chain){
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
    return chain
}

function preprocessChainRoot(chain){
    chain = util.assignDefaultValue(chain, 'verbose', false)
    chain = util.assignDefaultValue(chain, 'vars', {})
    // define subchain
    let subChain = {}
    if ('chains' in chain){
        subChain = {'chains' : chain.chains}
    }
    else if('command' in chain){
        chain.mode = 'series'
        subChain = {'command': chain.command, 'ins' : chain.ins, 'out' : chain.out}
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
        chain = util.replaceKey(chain, KEY_SYNONIM)
        // preprocess input, command and error
        let preprocessor = util.compose(preprocessChainCommand, preprocessChainIns, preprocessChainMode, preprocessChainError)
        chain = preprocessor(chain)
        // default values
        chain = util.assignDefaultValue(chain, DEFAULT_VALUE)
        // recursive subchain preprocessing
        if('chains' in chain){
            for(let i=0; i<chain.chains.length; i++){
                chain.chains[i] = preprocessChain(chain.chains[i], false)
            }
        }
        // for root, move chain to lower level
        if(isRoot){
            chain = preprocessChainRoot(chain)
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
        if(strVal.length <= 250 || util.isString(vars[key])){
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
    // get real moduleName
    let moduleNameParts = util.smartSplit(moduleName, ' ')
    for(let i in moduleNameParts){
        moduleNameParts[i] = util.unquote(moduleNameParts[i])
    }
    moduleName = moduleNameParts[0]
    let theModule
    try{
        theModule = require(moduleName)
    }
    catch(error){
        theModule = require(preprocessDirPath(cwd) + moduleName)
    }
    // determine runner
    let runner
    if(!util.isNullOrUndefined(theModule)){
        if(moduleNameParts.length == 1){
            runner = theModule
        }
        else{
            let runnerParts = moduleNameParts.slice(1)
            let runnerName = runnerParts.join(' ')
            let runnerNameParts = runnerName.split('.')
            runner = theModule
            for(let i in runnerNameParts){
                runner = runner[runnerNameParts[i]]
            }
        }
    }
    if(util.isNullOrUndefined(runner)){
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
 * @params {function} finalCallback
 */
function execute(chainConfigs, argv, presets, finalCallback, chainOptions){
    let ins, out, vars, chains, mode, verbose
    this.main()

    function main(){
        // argv should be array
        if(!util.isArray(argv)){
            argv = []
        }
        // preprocessing
        chainConfigs = preprocessChain(chainConfigs, true)
        // don't do anything if chainConfigs is wrong
        if(chainConfigs === false){
            console.error('[ERROR] Unable to fetch chain')
            finalCallback('', false, 'Unable to fetch chain')
            return null
        }
        // get ins, out, vars, chains, mode, and verbose
        this.ins     =  chainConfigs.ins
        this.out     =  chainConfigs.out
        this.vars    =  chainConfigs.vars
        this.chains  =  chainConfigs.chains
        this.mode    =  chainConfigs.mode
        this.verbose =  chainConfigs.verbose
        // override vars with presets
        if(util.isRealObject(presets)){
            Object.keys(presets).forEach(function(key){
                this.vars[key] = presets[key]
            })
        }
        // populate "vars" with "ins" and "process.argv"
        ins.forEach(function(key, index){
            if(index < argv.length){
                this.setVar(key, argv[index])
            }
        })
        // add "out" to "vars"
        this.vars = util.assignDefaultValue(this.vars, this.out, '')
        // add "cwd"
        this.setVar('_chain_cwd', preprocessDirPath(chainOptions.cwd))
        this.setVar('_init_cwd', preprocessDirPath(process.cwd()))
        // run the chains
        try{
            this.runChains(chains, mode, true)
        }
        catch(error){
            this.callFinalCallback(error, '')
            return null
        }
    }

    // function to run finalCallback or show the result
    function callFinalCallback(error, result, errorMessage){
        let output = this.out in this.vars? this.vars[out]: ''
        let success = true
        if(util.isNullOrUndefined(errorMessage)){
            errorMessage = ''
        }
        if(error){
            success = false
            if(stack in error){
                errorMessage = error.stack
            }
            console.error('[ERROR] Chain execution failed')
            console.error(errorMessage)
        }
        this.finalCallback(output, success, errorMessage)
    }

    function getNonLiteralVar(key){
        let keyParts = key.split('.')
        // bypass everything if the key is not nested
        if(keyParts.length == 1){
            return key in this.vars? this.vars[key]: 0
        }
        // recursively get value of vars
        let value = this.vars
        for(let i in keyParts){
            let keyPart = keyParts[i]
            if((util.isRealObject(value) || util.isArray(value)) && (keyPart in value)){
                value = value[keyPart]
            }
            else{
                value = 0
                break
            }
        }
        return value
    }

    function getVar(key){
        // is it literal?
        if(key.match(/^"(.*)"$/g) || key.match(/^'(.*)'$/g)){
            value = util.unquote(key)
            // turn it into object
            try{
                value = JSON.parse(value)
            }
            catch(err){
                value = JSON.parse(stringify(value))
            }
            return value
        }
        return this.getNonLiteralVar(key)
    }

    function setVar(key, value){
        if(util.isString(value)){
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
                if(!('keypart') in obj || !util.isRealObject(obj[keyPart])){
                    obj[keyPart] = {}
                }
                // Traverse. Javacript has "call by reference" !!!
                obj = obj[keyPart]
            }
        }
    }

    function getInputParameters(chainIns){
        let parameters = []
        chainIns.forEach(function(key){
            let arg = this.getVar(key)    
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
                arg = util.quote(arg)
            }
            parameters.push(arg)
        })
        return parameters
    }

    function getSingleModuleChainRunner(chainCommand, parameters, callback){
        let moduleName = chainCommand.substring(1, chainCommand.length-1)
        let logCommand = 'processModule('+stringify(moduleName)+', '+stringify(parameters)+', '+stringify(chainOptions.cwd)+', callback)'
        if(verbose){
            startTime = showStartTime(logCommand, chainOptions)
        }
        try{
            processModule(moduleName, parameters, chainOptions.cwd, function(output, success, errorMessage){
                // set default output, success, and errorMessage
                if(util.isNullOrUndefined(output)){ output = 0; }
                if(util.isNullOrUndefined(success)){ success = true; }
                if(util.isNullOrUndefined(errorMessage)){ errorMessage = ''; }
                // set variable
                this.setVar(chainOut, output)
                if(verbose){
                    showEndTime(moduleName, startTime)
                    showVars(moduleName, vars)
                }
                // if error, just stop the chain, and call the last callback
                if(this.getVar('_error') == true || !success){
                    if(this.getVar('_error') == true){
                        errorMessage = this.getVar('_error_message')
                    }
                    console.error('[ERROR] ERROR CONDITION DETECTED : _err=true')
                    console.error('[ERROR] ERROR MESSAGE : ' + errorMessage)
                    console.error('[ERROR] MODULE : ' + moduleName)
                    this.callFinalCallback(true, '', errorMessage)
                }
                else{
                    // continue the chain
                    callback()
                }
            })
        }catch(e){
            showFailure(logCommand)
            console.error('[ERROR] SCRIPT : ' + logCommand)
            this.callFinalCallback(true, '')
        }
    }

    function getSingleArrowFunctionChainRunner(chainCommand, parameters, callback){
        // if chainCommand is purely javascript's arrow function, we can simply use eval
        let jsScript = '(' + chainCommand + ')(' + parameters.join(', ') + ')'
        if(verbose){
            startTime = showStartTime(jsScript, chainOptions)
        }
        try{
            let output = eval(jsScript)
            // assign as output
            this.setVar(chainOut, output)
            if(verbose){
                showEndTime(jsScript, startTime)
                showVars(jsScript, vars)
            }
            // if error, just stop the chain, and call the last callback
            if(this.getVar('_error')){
                let errorMessage = this.getVar('_error_message')
                if(errorMessage == 0){
                    errorMessage = 'Chain execution stopped'
                }
                console.error('[ERROR] ERROR CONDITION DETECTED : _err=true')
                console.error('[ERROR] ERROR MESSAGE : ' + errorMessage)
                console.error('[ERROR] SCRIPT : ' + jsScript)
                this.callFinalCallback(false, '', errorMessage)
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
            this.callFinalCallback(false, '', e.stack)
        }
    }


    function getSingleCmdChainRunner(chainCommand, parameters, callback){
        // add parameter to chainCommand
        let cmdCommand = chainCommand + ' ' + parameters.join(' ')
        // benchmarking
        if(verbose){
            startTime = showStartTime(cmdCommand, chainOptions)
        }
        // run the command
        try{
            cmd.get(cmdCommand, {'cwd': chainOptions.cwd}, function(error, stdout, stderr){
                // it might be no error, but stderr exists
                if(stderr != ''){
                    console.warn(stderr)
                }
                // run callback
                if(!err){
                    // assign as output
                    this.setVar(chainOut, stdout)
                    if(verbose){
                        showEndTime(cmdCommand, startTime)
                        showVars(cmdCommand, vars)
                    }
                    // if error, just stop the chain, and call the last callback
                    if(this.getVar('_error')){
                        let errorMessage = this.getVar('_error_message')
                        if(errorMessage == 0){
                            errorMessage = 'Chain execution stopped'
                        }
                        console.error('[ERROR] ERROR CONDITION DETECTED : _err=true')
                        console.error('[ERROR] ERROR MESSAGE : ' + errorMessage)
                        console.error('[ERROR] COMMAND : ' + cmdCommand)
                        console.error(errorMessage)
                        this.callFinalCallback(false, '', errorMessage)
                    }
                    else{
                        // continue the chain
                        callback()
                    }
                }
                else{
                    showFailure(cmdCommand)
                    console.error('[ERROR] COMMAND : ' + cmdCommand)
                    console.error(error.stack)
                    this.callFinalCallback(false, '', error.stack)
                }
            })
        }
        catch(error){
            showFailure(cmdCommand)
            console.error('[ERROR] COMMAND : ' + cmdCommand)
            console.error(error.stack)
            this.callFinalCallback(false, '', error.stack)
        }
    }

    function getSingleChainRunner(chain){
        return function(callback){
            // get command, ins, and out
            let chainCommand = chain.command
            let chainIns = chain.ins
            let chainOut = chain.out
            let parameters = this.getInputParameters(chainIns) 
            let startTime = 0
            if(chainCommand.match(/^\[.*\]$/g)){
                this.getSingleModuleChainRunner(chainCommand, parameters, callback)
            }
            else if(chainCommand.match(/.*=>.*/g)){
                this.getSingleArrowFunctionChainRunner(chainCommand, parameters, callback)
            }
            else{
                this.getSingleCmdChainRunner(chainCommand, parameters, callback)
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
                this.runChains(subChains, subMode, false, callback)
            }
        }
        else if('command' in chain){
            // chain doesn't have subChains
            return this.getSingleChainRunner(chain)
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
                    script += 'let ' + word + '=' + stringify(this.getVar(word)) + ';'
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
    function getControlledActions(chains){
        let actions = []
        chains.forEach(function(chain){
            // only proceed if "chain.if" is true
            if(this.isTrue(chain.if)){
                let chainRunner = this.getChainRunner(chain)
                if(chainRunner != null){
                    // need a flag so that the chainRunner will be executed at least once
                    let firstRun = true
                    let alteredChainRunner = function(callback){
                        // if "chain.while" is true or this is the first run,
                        // then call this chainRunner one more time (recursive strategy)
                        if(this.isTrue(chain.while) || firstRun){
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
        let actions = this.getControlledActions(chains)
        // determine asyncRunner
        let asyncRunner
        if(mode == 'parallel'){
            asyncRunner = async.parallel
        }
        else{
            asyncRunner = async.series
        }
        // run actions
        if(isCoreProcess){
            asyncRunner(actions, this.callFinalCallback)
        }
        else{
            asyncRunner(actions, runCallback)
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
 * @params {function} finalCallback
 */

function executeChain(chain, argv, presets, finalCallback){
    if(util.isFunction(argv)){
        finalCallback = argv
        argv = []
        presets = {}
    }
    else if(util.isFunction(presets)){
        finalCallback = presets
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
            if(util.isFunction(finalCallback)){
                finalCallback(result, success, errorMessage)
            }
            else if(success){
                // Object should be shown as json
                if(util.isRealObject(result) || util.isArray(result)){
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
        if(!util.isFunction(args[index])){
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
