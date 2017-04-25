#! /usr/bin/env node

// imports
const fs = require('fs');
var cmd = require('node-cmd');
if(process.argv.length > 3){
    var srcFile = process.argv[2];
    var dstFile = process.argv[3];
    var command = process.argv.slice(4).join(' ');
    fs.stat(srcFile, function(err, srcStat){
        if(err){ // cannot get stat of srcFile
            console.error('[ERROR] Cannot get file stat of ' + srcFile);
            console.error(err);
        }
        else{
            fs.access(dstFile, function(err){
                if(err){ // cannot access dstFile (probably doesn't exists)
                    cmd.run(command); // compile
                }
                else{ // dstFile exists and accessible
                    fs.stat(dstFile, function(err, dstStat){
                        // only compile if dstFile modification time is older than srcFile modification time or if dstFile is not exists
                        if(err || (!err && srcStat.mtime > dstStat.mtime)){
                            cmd.run(command);
                        }
                    });
                }
            });
        }
    });
}
else{
    // show missing argument warning
    console.error('Missing Arguments');
    console.error('USAGE:');
    console.error('* ' + process.argv[1] + ' [src-file] [dst-file] [command]');
}
