#! /usr/bin/env node
'use strict';
let chimera = require('../index.js')

if(require.main === module){
    if(process.argv.length > 3){
        let host = process.argv[2]
        let chain = process.argv[3]
        let parameters = process.argv.slice(4)
        chimera.sender.send(host, chain, parameters, function(error, output){
            console.log(output)
        })
    }
    else{
        console.error('INVALID ARGUMENTS')
    }
}

