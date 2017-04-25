#! /usr/bin/env node

const fse = require('fs-extra');
const cmd = require('node-cmd');
const path = require('path');

if(process.argv.length > 2){
    var projectDir = process.argv[2];
    var currentDir = __dirname;
    fse.copy(path.join(currentDir, 'project-template'), projectDir, function(err){
        if (err){
            console.error(err);
        }
        else{
            process.chdir(projectDir);
            cmd.get('npm install', function(data, err, stderr){
            });
        }
    });
}
else{
    // show missing argument warning
    console.error('Missing Arguments');
    console.error('USAGE:');
    console.error('* ' + process.argv[1] + ' [project-directory]');
}
