#! /usr/bin/env node
'use strict';

let fse = require('fs-extra')
let chimera = require('../index.js')
let async = require('async')
let cmd = chimera.cmd
let util = chimera.util
let path = require('path')

if(require.main === module){
    if(process.argv.length > 2){
        let projectDir = process.argv.slice(2).join('_')
        let currentDir = __dirname
        console.warn('[ERROR] Copying direcory...')
        async.series([
            // copy directory
            (callback) => {
                fse.copy(path.join(currentDir, '../node_modules/chimera-web-framework'), projectDir, function(error){
                    if(error){
                        console.error('[ERROR] Cannot copy directory')
                        console.error(error.stack)
                    }
                    else{
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
                        console.error(error.stack)
                    }
                    else{
                        callback()
                    }
                })
            }
            // read package-template.json and rewrite package.json
            (callback) => {
                util.readJson('package-template.json', function(obj, success, errorMessage){
                    if(!success){
                        console.error('[ERROR] Cannot read package-template.json')
                        console.error(errorMessage)
                    }
                    else{
                        obj.name = projectDir
                        util.writeJson('package.json', function(obj, success, errorMessage)){
                            if(!success){
                                console.error('[ERROR] Cannot write package.json')
                                console.error(errorMessage)
                            }
                            else{
                                callback()
                            }
                        }
                    }
                })
            },
            // run npm install
            (callback) => {
                cmd.get('npm install', function(error, result){
                    if(error){
                        console.error('[ERROR] Cannot perform npm install')
                        console.error(error.stack)
                    }
                    else{
                        callback()
                    }
                })
            }
            // delete package-template.json
            (callback) => {
                fse.unlink('package-tempalte.json',(error)=>{
                    if(error){
                        console.error('[ERROR] Cannot remove package-template.json')
                        console.error(error.stack)
                    }
                    else{
                        // move to upper directory
                        process.chdir('..')
                        callback()
                    }
                })
            }
        ], function(error, result){
            // do nothing
        })
    }
    else{
        console.error('INVALID PARAMETERS')
    }
}
