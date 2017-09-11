#! /usr/bin/env node
'use strict';

// imports
const fs = require('fs')
const chimera = require('chimera-framework/core')
const cmd = chimera.cmd

function execute(srcFile, dstFile, command, callback){
    // preprocess callback
    if(typeof(callback) != 'function'){
        callback = function(result, success, errorMessage){
            console.log(JSON.stringify({'result':result, 'success':success, 'errorMessage':errorMessage}))
        }
    }
    // get status of source file
    fs.stat(srcFile, function(err, srcStat){
        let result = {'is_command_executed':true}
        if(err){
            // cannot get stat of srcFile
            console.error('[ERROR] Cannot get file stat of ' + srcFile)
            console.error(err)
            result.is_command_executed = false
            calback(result, false, err)
        }
        else{
            // get status of destination file
            fs.access(dstFile, function(err){
                if(err){
                    // cannot access dstFile (probably doesn't exists)
                    cmd.get(command, function(err, data, stderr){
                        callback(result, true, err)
                    }) // compile
                }
                else{
                    // dstFile exists and accessible
                    fs.stat(dstFile, function(err, dstStat){
                        // only compile if dstFile modification time is older than srcFile modification time or if dstFile is not exists
                        if(err || (!err && srcStat.mtime > dstStat.mtime)){
                            cmd.get(command, function(err, data, stderr){
                                callback(result, true, err)
                            })
                        }
                        else{
                            result.is_command_executed = false
                            callback(result, true, err)
                        }
                    })
                }
            })
        }
    })
}

module.exports = execute

if(require.main === module){
    // The program needs at least 3 parameter (excluding the default 3)
    // Example: node eisn.js src.java src.class javac src.java
    if(process.argv.length > 3){
        let srcFile = process.argv[2]
        let dstFile = process.argv[3]
        let command = process.argv.slice(4).join(' ')
        execute(srcFile, dstFile, command)
    }
    else{
        // show missing argument warning
        console.error('Missing Arguments')
        console.error('USAGE:')
        console.error('* ' + process.argv[1] + ' [src-file] [dst-file] [command]')
    }
}
