#! /usr/bin/env node

// imports
var cmd = require('node-cmd');
var async = require('async');
var fs = require('fs');
var yaml = require('js-yaml');

function preprocessChain(chain){
    if(typeof(chain) === 'object'){
        if('series' in chain){
            chain['mode'] = 'series';
            chain['chains'] = chain['series'];
        }
        else if('parallel' in chain){
            chain['mode'] = 'parallel';
            chain['chains'] = chain['parallel'];
        }
    }
    return chain;
}

function preprocessIns(ins){
    if(typeof(ins) === 'string'){
        ins = ins.split(',');
        // trim the spaces
        newIns = [];
        ins.forEach(function(input){
            newIns.push(input.trim());
        });
        ins = newIns;
    }
    return ins;
}

function execute(chainConfigs, argv, executeCallback){
    chainConfigs = preprocessChain(chainConfigs);

    // get ins, out, vars, chains, mode, and verbose
    var ins     = 'ins' in chainConfigs? chainConfigs.ins: [];
    var out     = 'out' in chainConfigs? chainConfigs.out: '_';
    var vars    = 'vars' in chainConfigs? chainConfigs.vars: {};
    var chains  = 'chains' in chainConfigs? chainConfigs.chains: [];
    var mode    = 'mode' in chainConfigs? chainConfigs.mode: 'series';
    var verbose = 'verbose' in chainConfigs? chainConfigs.verbose: false;

    // preprocess "ins"
    ins = preprocessIns(ins);

    // populate "vars" based on "ins" and "process.argv"
    ins.forEach(function(key, index){
        if(typeof(argv) != 'array' && typeof(argv) != 'object'){
            argv = [];
        }
        if(index < argv.length){
            vars[key] = argv[index];
        }
        else if(!(key in vars)){
            vars[key] = 0;
        }
    });

    // run the chains
    runChains(chains, mode, true);

    // The sub functions ================================================

    // this will show the output, or use custom callback to process the output
    function lastProcessOutput(err, result){
        var output = 'out' in vars? vars.out: '';
        // execute the callback if defined, or show the output
        if(typeof(executeCallback) === 'function'){
            executeCallback(vars[out]);
        }
        else{
            console.log(vars[out]);
        }
    }

    // get single chain command's executor
    function getChainRunner(chain){
        return function(callback){
            // get command, ins, and out
            var chainCommand = chain.command;
            var chainIns = 'ins' in chain? chain.ins : [];
            var chainOut = 'out' in chain? chain.out: '_';
            // preprocess "ins"
            chainIns = preprocessIns(chainIns);
            chainIns.forEach(function(key){
                var arg = String(vars[key]);
                arg = arg.replace('"', '\"');
                arg = arg.replace('\n', '\\n');
                chainCommand += ' "' + arg + '"';
            });
            // run the command
            cmd.get(chainCommand, function(data, err, stderr){
                if(verbose){
                    console.info('[INFO] Running: ' + chainCommand);
                }
                if(!err){
                    vars[chainOut] = data.trim();
                    if(verbose){
                        console.info('[INFO] States: ' + JSON.stringify(vars));
                    }
                    // run callback if there is no error
                    callback();
                }
                else{
                    console.info('[ERROR] Message: ' + stderr);
                }
            });
        };
    }

    // get actions that will be used in async process
    function getActions(chains){
        var actions = [];
        chains.forEach(function(chain){
            // preprocess chain if it is a string
            if(typeof(chain) == 'string'){
                chain = {'ins' : [], 'out' : '_', 'command' : chain};
            }
            // preprocess chain
            chain = preprocessChain(chain);
            // determine appropriate action for chain based on it's subChains exixtance
            if('chains' in chain){
                // chain has other subChains
                var subMode = 'mode' in chain? chain.mode: 'series';
                var subChains = 'chains' in chain? chain.chains: [];
                actions.push(function(callback){
                    runChains(subChains, subMode, false, callback);
                });
            }
            else{
                // chain doesn't have subChains
                actions.push(getChainRunner(chain));
            }
        });
        return actions;
    }

    // run async process
    function runChains(chains, mode, isCoreProcess, runCallback){
        // populate actions
        var actions = getActions(chains);
        // run actions
        if(mode == 'series'){
            // series
            if(isCoreProcess){
                async.series(actions, lastProcessOutput);
            }
            else{
                async.series(actions, runCallback);
            }
        }
        else if(mode == 'parallel'){
            // parallel
            if(isCoreProcess){
                async.parallel(actions, lastProcessOutput);
            }
            else{
                async.parallel(actions, runCallback);
            }
        }
    }

}

// This will be executed when someone run this module manually
if(require.main === module){
    if(process.argv.length > 2){
        // first argument of the program (start from 2) is chain name or json
        var parameter = process.argv[2];
        // second until last arguments are input of the first chain
        var argv = process.argv.slice(3);
        // assume parameter is file
        fs.readFile(parameter, function(err, data){
            var chainConfigs = {};
            if(!err){
                // parameter is a file
                var parameterParts = parameter.split('/');
                if(parameterParts.length > 1){
                    // perform chdir if necessary
                    var pathParts = parameterParts.slice(0,-1);
                    var path = pathParts.join('/');
                    process.chdir(path);
                }
                chainConfigs = yaml.safeLoad(data);
            }
            else{
                // parameter is a json, not a file
                chainConfigs = yaml.safeLoad(parameter);
            }
            execute(chainConfigs, argv);
        });
    }
    else{
        // show missing arguments warning
        console.log('Missing Arguments');
        console.log('USAGE:');
        console.log('* core.js [chain-file]');
        console.log('* core.js [json-formatted-chain]');
    }
}

// The exported resources
module.exports = {
    'execute' : execute
};
