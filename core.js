// imports
var cmd = require('node-cmd');
var async = require('async');
var fs = require('fs');

function execute(chainConfigs, argv, executeCallback){
    // get values from chainConfigs
    var vars    = 'vars' in chainConfigs? chainConfigs.vars: {};
    var ins     = 'ins' in chainConfigs? chainConfigs.ins: [];
    var out     = 'out' in chainConfigs? chainConfigs.out: '_';
    var chains  = 'chains' in chainConfigs? chainConfigs.chains: [];
    var mode    = 'mode' in chainConfigs? chainConfigs.mode: 'series';
    var verbose = 'verbose' in chainConfigs? chainConfigs.verbose: false;

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
           var chain_command = chain.command;
            var chain_ins = 'ins' in chain? chain.ins : [];
            var chain_out = 'out' in chain? chain.out: '_';
            chain_ins.forEach(function(key){
                var arg = String(vars[key]);
                arg = arg.replace('"', '\"');
                arg = arg.replace('\n', '\\n');
                chain_command += ' "' + arg + '"';
            });
            // run the command
            cmd.get(chain_command, function(data, err, stderr){
                if(verbose){
                    console.info('[INFO] Running: ' + chain_command);
                }
                if(!err){
                    vars[chain_out] = data.trim();
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
            if('chains' in chain){
                // chain has other subprocess
                var subMode = 'mode' in chain? chain.mode: 'series';
                var subChains = 'chains' in chain? chain.chains: [];
                actions.push(function(callback){
                    runChains(subChains, subMode, false, callback);
                });
            }
            else{
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
                //actions.push(lastProcessOutput);
                async.series(actions, lastProcessOutput);
            }
            else{
                async.series(actions, runCallback);
                //actions.push(runCallback);
            }
            //async.series(actions);
        }
        else{
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
                // if parameter is not file, then it is json
                chainConfigs = JSON.parse(data);
            }
            else{
                // otherwise it is really file, read it and parse
                chainConfigs = JSON.parse(parameter);
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
