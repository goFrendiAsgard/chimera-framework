const processChild = require('process-child')

function smartSplit(string, delimiter){
    let singleQuoteCount = 0
    let doubleQuoteCount = 0
    let data = []
    let word = ''
    for(let i=0; i<string.length; i++){
        let chr = string.charAt(i)
        if(chr == delimiter && doubleQuoteCount % 2 == 0 && singleQuoteCount % 2 == 0){
            data.push(word.trim())
            word = ''
        }
        else{
            if(chr == "'"){
                singleQuoteCount ++
            }
            else if(chr == '"'){
                doubleQuoteCount ++
            }
            word += chr
        }
    }
    data.push(word.trim())
    return data
}

const cmd = {
    run:runCommand,
    get:getString
}

function getCommandConfig(command){
    let executor = childProcess.exec
    let args = null
    // use execFile only if there is no need for pipe, redirecting, etc
    if(!command.match(/<>\|&\$/g)){
        executor = childProcess.execFile
        let commandParts = smartSplit(command, ' ')
        command = commandParts[0]
        args = commandParts.slice(1)
        for(let i=0; i<args.length; i++){
            // strip '"' or "'"
            let arg = args[i].replace(/^"(.*)"$/g, '$1')
            if(arg == args[i]){
                arg = args[i].replace(/^'(.*)'$/g, '$1')
            }
            // strip \\
            arg.replace(/\\\\/g, '$1')
            args[i] = arg
        }
    }
    return {'command':command, 'args':args, 'executor': executor}
}

function runCommand(command){
    let commandConfig = getCommandConfig(command)
    command = commandConfig['command']
    let args = commandConfig['args']
    let executor = commandConfig['executor']
    executor(command)
}

function getString(command,callback){
    let commandConfig = getCommandConfig(command)
    command = commandConfig['command']
    let args = commandConfig['args']
    let executor = commandConfig['executor']
    if(args === null){
        executor(
            command,
            (
                function(){
                    return function(err,data,stderr){
                        callback(data,err,stderr);
                    }
                }
            )(callback)
        );
    }
    else{
        executor(
            command, args,
            (
                function(){
                    return function(err,data,stderr){
                        callback(data,err,stderr);
                    }
                }
            )(callback)
        );
    }
}
