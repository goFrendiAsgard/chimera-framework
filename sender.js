#! /usr/bin/env node

const querystring = require('querystring')

let method = 'POST'
let args = ''

function getOptions(host, data){
    let protocol = 'http'
    let path = ''
    let port = 80
    // get protocol
    hostParts = host.split('://') 
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

if(process.argv.length > 3){
    let host = process.argv[2]
    let chain = process.argv[3]
    let bodyRequest = querystring.stringify({'chain' : chain, 'input' : process.argv.slice(4)})
    let options = getOptions(host, bodyRequest)
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
                if(output.success){
                    console.log(output.response)
                }
                else{
                    console.error('[ERROR] ' + JSON.stringify(output.errorMessage))
                }
            }
            catch(err){
                console.error('[ERROR] Failed to parse JSON')
                console.error(err)
            }
        })
    })
    // error handler
    httpreq.on('error', function (e) {
        console.error('[ERROR] Request failed')
        console.error(JSON.stringify(e))
    });
    // timeout handler
    httpreq.on('timeout', function () {
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


/*
TEST:
console.log(getOptions('http://facebook.com/abc/def'))
console.log(getOptions('http://facebook.com:80/abc/def'))
console.log(getOptions('https://facebook.com/abc/def'))
console.log(getOptions('https://facebook.com:80/abc/def'))
console.log(getOptions('facebook.com'))
console.log(getOptions('localhost:3000'))
*/
