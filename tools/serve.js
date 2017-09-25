#! /usr/bin/env node
'use strict';

let chimera = require('../index.js')

if(require.main === module){
    chimera.server(function(result, error, errorMessage){
        // do nothing. Probably we will need this someday
    })
}
