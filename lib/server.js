#! /usr/bin/env node
'use strict';

let web = require('./web.js')

function server(callback){
    let app, result
    let port = process.env.PORT || '3000'
    let webConfig = {
        'routes': [{
            'route' : '/',
            'method' : 'all',
            'chain' : '',
        }]
    }
    try{
        // create web app
        app = web.createApp(webConfig)
        // start the web app
        app.listen(port, function () {
            console.log('Chimera service started at port ' + port)
            result = {'app':app, 'port':port}
            callback(result, true, '')
        })
    }
    catch(error){
        console.error(error.stack)
        result = null
        callback(result, false, error.stack)
    }
}

module.exports = server
