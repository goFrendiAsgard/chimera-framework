#! /usr/bin/env node

// imports
const fs = require('fs')
const cmd = require('node-cmd')

// The program needs at least 3 parameter (excluding the default 3)
// Example: node execIfNewer.js src.java src.class javac src.java
if(process.argv.length > 3){
    let srcFile = process.argv[2]
    let dstFile = process.argv[3]
    let command = process.argv.slice(4).join(' ')
    // get status of source file
    fs.stat(srcFile, function(err, srcStat){
        if(err){ 
            // cannot get stat of srcFile
            console.error('[ERROR] Cannot get file stat of ' + srcFile)
            console.error(err)
        }
        else{
            // get status of destination file
            fs.access(dstFile, function(err){
                if(err){ 
                    // cannot access dstFile (probably doesn't exists)
                    cmd.run(command) // compile
                }
                else{ 
                    // dstFile exists and accessible
                    fs.stat(dstFile, function(err, dstStat){
                        // only compile if dstFile modification time is older than srcFile modification time or if dstFile is not exists
                        if(err || (!err && srcStat.mtime > dstStat.mtime)){
                            cmd.run(command)
                        }
                    })
                }
            })
        }
    })
}
else{
    // show missing argument warning
    console.error('Missing Arguments')
    console.error('USAGE:')
    console.error('* ' + process.argv[1] + ' [src-file] [dst-file] [command]')
}
