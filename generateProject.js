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
    let projectDir = process.argv.slice(2).join('_')
    let currentDir = __dirname
    // copy project-template to projectDir
    console.warn('Creating new project')
    fse.copy(path.join(currentDir, 'project-template'), projectDir, function(err){
        if (err){
            // something goes wrong, let the user know
            console.error(err)
        }
        else{
            // change to projectDir
            process.chdir(projectDir)
            // replace project-template in package.json
            console.warn('Processing package.json')
            replace(path.join('package.json'), /project-template/g, projectDir, function(){
                // replace project-template in config.yaml
                console.warn('Processing config.yaml')
                replace(path.join('config.yaml'), /project-template/g, projectDir, function(){
                    // install all dependencies
                    console.warn('Installing dependencies')
                    cmd.get('npm install', function(err, data, stderr){
                        if(err){
                            console.error(err)
                            console.warn('Project ' + projectDir + ' has been created, but dependencies are not installed')
                            console.warn('Please connect to the internet and run "npm install"')
                        }
                        else{
                            console.warn(data)
                            console.warn('Project ' + projectDir + ' has been created successfully')
                        }
                    })
                    // try to delete migrationCache
                    fse.unlink('chains/migrations/migration.json',(err)=>{})
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
