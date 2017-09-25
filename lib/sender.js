#! /usr/bin/env node
'use strict';

const querystring = require('querystring')

/*
TEST:
console.log(createHttpOption('http://facebook.com/abc/def'))
console.log(createHttpOption('http://facebook.com:80/abc/def'))
console.log(createHttpOption('https://facebook.com/abc/def'))
console.log(createHttpOption('https://facebook.com:80/abc/def'))
console.log(createHttpOption('facebook.com'))
console.log(createHttpOption('localhost:3000'))
*/
function createHttpOption(host, data){
    let protocol = 'http'
    let path = ''
    let port = 80
    // get protocol
    let hostParts = host.split('://')
    if(hostParts.length > 1){
        protocol = hostParts[0]
        host = hostParts[1]
    }
    protocol = protocol.toLowerCase()
    port = protocol == 'https'? 443: 80
    // get host
    hostParts = host.split(':')
    if(hostParts.length > 1){
        host = hostParts[0]
        hostParts = hostParts[1].split('/')
        // get port and path
        if(hostParts.length == 1){
            port = hostParts[0]
        }
        else{
            path = hostParts.slice(1).join('/')
        }
    }
    else{
        hostParts = hostParts[0].split('/')
        host = hostParts[0]
        path = hostParts.slice(1).join('/')
    }
    // path should be at least '/'
    path = '/' + path
    return {
        'protocol' : protocol+':',
        'host' : host,
        'port' : port,
        'path' : path,
        'method' : 'POST',
        'headers': {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Content-Length': Buffer.byteLength(data)
        }
    }
}

function sender(host, chain, params, callback){
    let bodyRequest = querystring.stringify({'chain' : chain, 'input' : params})
    let options = createHttpOption(host, bodyRequest)
    let protocol = options.protocol
    // create request using required protocol
    let http = protocol == 'https'? require('https'): require('http')
    let httpreq = http.request(options, function (response) {
        response.setEncoding('utf8')
        let output = ''
        // get each chunk as output
        response.on('data', function (chunk) {
            output += chunk
        })
        // show the output
        response.on('end', function() {
            try{
                output = JSON.parse(output)
                callback(output.response, output.success, output.errorMessage)
            }
            catch(error){
                callback(null, false, error.stack)
                console.error('[ERROR] Error parsing JSONG')
                console.error(error.stack)
            }
        })
    })
    // error handler
    httpreq.on('error', function (error) {
        callback(null, false, error.stack)
        console.error('[ERROR] Request failed')
        console.error(error.stack)
    });
    // timeout handler
    httpreq.on('timeout', function () {
        callback(null, false, 'Request timeout')
        console.error('[ERROR] Request timeout')
        httpreq.abort();
    });

    if(process.env.TIMEOUT){
        // get timeout from environment
        httpreq.setTimeout(parseInt(process.env.TIMEOUT))
    }
    else{
        // by default, a minute without response, cut it off
        httpreq.setTimeout(60000);
    }

    // send request
    httpreq.write(bodyRequest)
    httpreq.end()
}

module.exports = sender


