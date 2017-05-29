#! /usr/bin/env node

const fse = require('fs-extra')
const cmd = require('node-cmd')
const path = require('path')

// replace pattern by replacement in a file, and then do callback
function replace(file, pattern, replacement, callback){
    fse.readFile(file, 'utf8', function(err, content){
        content = content.replace(pattern, replacement)
        fse.writeFile(file, content, callback)
    })
}

// The program needs at least 1 parameter (excluding the default 3)
// Example: node generateProject.js projectName
if(process.argv.length > 2){
    let projectDir = process.slice(2).join('_')
    let currentDir = __dirname
    // copy project-template to projectDir
    fse.copy(path.join(currentDir, 'project-template'), projectDir, function(err){
        if (err){
            // something goes wrong, let the user know
            console.error(err)
        }
        else{
            // change to projectDir
            process.chdir(projectDir)
            // replace project-template in package.json
            replace(path.join('package.json'), /project-template/g, projectDir, function(){
                // replace project-template in config.yaml
                replace(path.join('config.yaml'), /project-template/g, projectDir, function(){
                    // install all dependencies
                    cmd.get('npm install', function(data, err, stderr){
                        console.log('Project ' + projectDir + ' has been created')
                    })
                })
            })
        }
    })
}
else{
    // show missing argument warning
    console.error('Missing Arguments')
    console.error('USAGE:')
    console.error('* ' + process.argv[1] + ' [project-directory]')
}
