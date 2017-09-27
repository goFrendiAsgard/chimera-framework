#! /usr/bin/env node
'use strict';

let core = require('./core.js')
let web = require('./web.js')
let util = require('./util.js')

function isInsidePublishedDirectory(file){
    // get published directory
    let publishedDirectory = process.env.PUBLISHED
    if(!publishedDirectory){
        return true
    }
    publishedDirectory = path.resolve(publishedDirectory)
    file = path.resolve(file)
    // is file in publised directory
    return file.search(publishedDirectory) == 0
}

function runChainCallback(result, callback){
    let response = {'response' : JSON.stringify(result)}
    callback(null, response)
}

function processChain(state, callback){
    let request = state.request
    let input = util.isArray(request.body.input) ? request.body.input : []
    let chain = util.isString(request.body.chain)? request.body.chain : 'index.yaml'
    let result = {'success' : true, 'errorMessage' : '', 'response': ''}
    if(isInsidePublishedDirectory(chain)){
        // call chimera process
        try{
            core.executeChain(chain, input, function(error, output){
                if(!error){
                    // success
                    result.response = output
                    runChainCallback(result, callback)
                }
                else{
                    // chain call failed
                    result.success = false
                    result.errorMessage = errorMessage
                    runChainCallback(result, callback)
                }
            })
        }
        catch(error){
            // failed to run
            result.success = false
            result.errorMessage = 'Cannot run ' + chain
            runChainCallback(result, callback)
        }
    }
    else{
        // not authorized
        result.success = false
        result.errorMessage = 'Cannot access ' + chain
        runChainCallback(result, callback)
    }

}

function serve(callback){
    let app, result
    let port = process.env.PORT || '3000'
    let webConfig = {
        'routes': [{
            'route' : '/',
            'method' : 'all',
            'chain' : '(state) -> [chimera-framework server.processChain]',
        }]
    }
    try{
        // create web app
        app = web.createApp(webConfig)
        // start the web app
        app.listen(port, function () {
            console.log('Chimera service started at port ' + port)
            result = {'app':app, 'port':port}
            callback(null, result)
        })
    }
    catch(error){
        result = null
        callback(error, result)
    }
}

module.exports = {
    'processChain' : processChain,
    'serve' : serve,
}
