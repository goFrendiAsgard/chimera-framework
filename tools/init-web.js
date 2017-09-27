#! /usr/bin/env node
'use strict';

let fse = require('fs-extra')
let chimera = require('../index.js')
let async = require('neo-async')
let cmd = chimera.cmd
let util = chimera.util
let path = require('path')

function finalCallback(error, result){
    if(error){
        console.error(error)
    }
    else{
        console.warn('Complete...')
    }
}

function initWeb(projectDir){
    let currentDir = __dirname
    console.error(currentDir)
    async.series([
        // copy directory
        (callback) => {
            console.warn('[INFO] Copying directory...')
            fse.copy(path.join(currentDir, '../node_modules/chimera-web-framework'), projectDir, function(error){
                if(error){
                    console.error('[ERROR] Cannot copy directory')
                    finalCallback(error)
                }
                else{
                    console.warn('[INFO] Done copying directory...')
                    callback()
                }
            })
        },
        // change directory and delete package.json
        (callback) => {
            process.chdir(projectDir)
            fse.unlink('package.json',(error)=>{
                if(error){
                    console.error('[ERROR] Cannot remove package.json')
                    finalCallback(error)
                }
                else{
                    console.warn('[INFO] Remove package.json...')
                    callback()
                }
            })
        },
        // read package-template.json and rewrite package.json
        (callback) => {
            util.readJson('package-template.json', function(error, obj){
                if(error){
                    console.error('[ERROR] Cannot read package-template.json')
                    finalCallback(error)
                }
                else{
                    obj.name = projectDir
                    util.writeJson('package.json', obj, function(error){
                        if(error){
                            console.error('[ERROR] Cannot write package.json')
                            finalCallback(error)
                        }
                        else{
                            console.warn('[INFO] Creating new package.json...')
                            callback()
                        }
                    })
                }
            })
        },
        // run npm install
        (callback) => {
            cmd.get('npm install', function(error, result){
                if(error){
                    console.error('[ERROR] Cannot perform npm install')
                    finalCallback(error)
                }
                else{
                    console.warn('[INFO] Performing npm install...')
                    callback()
                }
            })
        },
        // delete package-template.json
        (callback) => {
            fse.unlink('package-template.json',(error)=>{
                if(error){
                    console.error('[ERROR] Cannot remove package-template.json')
                    finalCallback(error)
                }
                else{
                    // move to upper directory
                    process.chdir('..')
                    console.warn('[INFO] Delete package-template.json...')
                    callback()
                }
            })
        },
    ], finalCallback)
}

if(require.main === module){
    if(process.argv.length > 2){
        let projectDir = process.argv.slice(2).join('_')
        initWeb(projectDir)
    }
    else{
        console.error('INVALID PARAMETERS')
    }
}
