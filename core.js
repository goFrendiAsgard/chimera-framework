#! /usr/bin/env node

// imports
const cmd = require('node-cmd')
const async = require('async')
const fs = require('fs')
const yaml = require('js-yaml')

// adjust JSON
const stringify = require('json-stringify-safe')

// this one is for benchamarking
function getFormattedNanoSecond(time){
    let nano = time[0] * 1e9 + time[1]
    return nano.toLocaleString()
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
function preprocessIns(ins){
    if(typeof(ins) === 'string'){
        // remove spaces
        ins = ins.trim()
        // remove parantheses
        ins = ins.replace(/^\((.*)\)/, '$1')
        // split
        ins = ins.split(',')
        newIns = []
        ins.forEach(function(input){
            // remove spaces for each component
            newIns.push(input.trim())
        })
        ins = newIns
    }
    return ins
}

function preprocessCommand(chain){
    if('command' in chain){
        // split command by '->'
        let commandParts = chain.command.split('->')
        for(let i =0; i<commandParts.length; i++){
            commandParts[i] = commandParts[i].trim()
        }
        // if commandParts has 3 elements, then they must be input, process and output
        if(commandParts.length == 3){
            chain.ins = commandParts[0]
            chain.command = commandParts[1]
            chain.out = commandParts[2]
        }
        else if(commandParts.length == 2){
            // input and process
            if(commandParts[0].match(/\(.*\)/g)){
                chain.ins = commandParts[0]
                chain.command = commandParts[1]
            }
            // process and output
            else{
                chain.command = commandParts[0]
                chain.out = commandParts[1] 
            }
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
    if(typeof(chain) == 'string'){
        chain = {'command' : chain}
    }
    // other process require chain to be object
    if(typeof(chain) === 'object'){
        chain = preprocessCommand(chain)
        // default values
        chain.ins   = 'ins' in chain? preprocessIns(chain.ins): []
        chain.out   = 'out' in chain? chain.out: '_ans'
        chain.mode  = 'mode' in chain? chain.mode: 'series'
        chain.if    = 'if' in chain? chain.if: true
        chain.while = 'while' in chain? chain.while: false
        if(isRoot){
            // The root can contains only a single command (no "chains" or "mode")
            if ('command' in chain){
                chain.mode = 'series'
                chain.chains = [{'command': chain.command, 'ins':chain.ins, 'out':chain.out}]
                delete chain.command
            }
            // default values
            chain.verbose = 'verbose' in chain? chain.verbose: false
            chain.vars    = 'vars' in chain? chain.vars: {}
        }
        // preprocess 'series' shorthand
        if('series' in chain){
            chain.mode = 'series'
            chain.chains = chain.series
            delete chain.series
        }
        // preprocess 'parallel' shorthand
        if('parallel' in chain){
            chain.mode = 'parallel'
            chain.chains = chain.parallel
            delete chain.parallel
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

/**
 * Execute chain configuration
 * Example
 *  var chainConfig = {
 *      'series' : {'command': 'python operation.py', 'ins': ['a, 'b', 'operation'], 'out': 'c'},
 *      'ins':['a','b'],
 *      'out':'c'};
 *  executeYaml(chainConfig, [5 6], {'operation' : 'plus'}, function(result, success, errorMessage){console.log(out);});
 *  executeYaml(chainConfig, [5 6], {'operation' : 'plus'});
 *  executeYaml(chainConfig, [5 6]);
 *  executeYaml(chainConfig);
 *
 * @params {object} chainConfig
 * @params {array} argv
 * @params {object} presets
 * @params {function} executeCallback
 */
function execute(chainConfigs, argv, presets, executeCallback){
    // argv should be array or object
    if(typeof(argv) != 'array' && typeof(argv) != 'object'){
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
    // populate "vars" based on "ins" and "process.argv"
    ins.forEach(function(key, index){
        if(index < argv.length){
            setVar(key, argv[index])
            //vars[key] = argv[index]
        }
        else if(!(key in vars)){
            vars[key] = 0
        }
    })
    // run the chains
    try{
        runChains(chains, mode, true)
    }
    catch(e){
        console.error('[ERROR] Chain execution failed')
        console.error(e)
        executeCallback('', false, e)
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
            value = value.replace(/[ \n]+$/g, '')
        }
        // If the value can be parsed into object, parse it 
        try{
            value = JSON.parse(value);
        } catch(e){}
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
            // we can only send string in CLI, thus if the input is object, 
            // it should be stringified
            chainIns.forEach(function(key){
                let arg = ''
                if(key.match(/"(.*)"/g) || key.match(/'(.*)'/g)){
                    arg = key.substring(1, key.length-1); 
                }
                else if(typeof(vars[key]) == 'object'){
                    arg = stringify(getVar(key))
                }
                else{
                    arg = String(getVar(key))
                }
                arg = arg.replace(/"/g, '\\\"')
                arg = arg.replace(/\n/g, '\\n')
                arg = arg.trim()
                chainCommand += ' "' + arg + '"'
            })
            // benchmarking
            let startTime = 0
            if(verbose){
                startTime = process.hrtime(); 
                    console.warn('[INFO] START PROCESS ['+chainCommand+'] AT    : ' + getFormattedNanoSecond(startTime))
            }
            // run the command
            try{
                cmd.get(chainCommand, function(err, data, stderr){
                    if(verbose){
                        let diff = process.hrtime(startTime);
                        let endTime = process.hrtime(); 
                        console.warn('[INFO] END PROCESS   ['+chainCommand+'] AT    : ' + getFormattedNanoSecond(endTime))
                        console.warn('[INFO] PROCESS       ['+chainCommand+'] TAKES : ' + getFormattedNanoSecond(diff) + ' NS')
                    }
                    if(!err){
                        // assign as output
                        setVar(chainOut, data)
                        if(verbose){
                            console.warn('[INFO] STATE AFTER   ['+chainCommand+']       : ' + stringify(vars))
                        }
                        // run callback if there is no error
                        callback()
                    }
                    else{
                        console.error('[ERROR] FAILED TO PROCESS ['+chainCommand+']  : ')
                        console.error(err)
                        executeCallback('', false, err)
                    }
                })
            }
            catch(e){
                console.error('[ERROR] Error running [' + chainCommand + ']')
                executeCallback('', false, e)
                console.error(e)
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
            script = '(function(){'
            for(let i=0; i<words.length; i++){
                word = words[i]
                if(word in vars){
                    script += 'let ' + word + '=' + stringify(vars[word]) + ';'
                }
            }
            script += 'return ' + statement + ';})()'
            // execute script
            truth = eval(script)
        }
        catch(error){
            console.error('[ERROR] Failed to evaluate condition')
            console.error(script)
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
 * Execute YAML chain file
 * Example
 *  executeYaml('myChain.yaml', [5 6], {'operation' : 'plus'}, function(result, success){console.log(out);});
 *  executeYaml('myChain.yaml', [5 6], {'operation' : 'plus'});
 *  executeYaml('myChain.yaml', [5 6]);
 *  executeYaml('myChain.yaml');
 *
 * @params {string} yamlFile
 * @params {array} argv
 * @params {object} presets
 * @params {function} executeCallback
 */
function executeYaml(yamlFile, argv, presets, executeCallback){
    fs.readFile(yamlFile, function(err, data){
        let chainConfigs = {}
        let currentPath = process.cwd()
        if(!err){
            // yamlFile is really a file
            let yamlParts = yamlFile.split('/')
            if(yamlParts.length > 1){
                // perform chdir if necessary
                let pathParts = yamlParts.slice(0,-1)
                let path = pathParts.join('/')
                process.chdir(path)
            }
            chainConfigs = yaml.safeLoad(data)
        }
        else{
            // yamlFile is a json, not a file
            chainConfigs = yaml.safeLoad(yamlFile)
        }
        // ensure we going back to this directory
        alteredCallback = function(result, success, errorMessage){
            // ensure we return to current dir
            process.chdir(currentPath)
            // execute callback
            if(typeof(executeCallback) === 'function'){
                executeCallback(result, success, errorMessage)
            }
            else if(success){
                console.log(result)
            }
        }
        execute(chainConfigs, argv, presets, alteredCallback)
    })
}

// This will be executed when someone run this module manually
if(require.main === module){
    if(process.argv.length > 2){
        // first argument of the program (start from 2) is chain name or json
        var parameter = process.argv[2]
        // second until last arguments are input of the first chain
        var argv = process.argv.slice(3)
        // execute Yaml
        executeYaml(parameter, argv)
    }
    else{
        // show missing arguments warning
        console.error('Missing Arguments')
        console.error('USAGE:')
        console.error('* ' + process.argv[1] + ' [chain-file]')
        console.error('* ' + process.argv[1] + ' [yaml-formatted-chain]')
    }
}

// The exported resources
module.exports = {
    'executeYaml' : executeYaml,
    'getFormattedNanoSecond' : getFormattedNanoSecond,
}
