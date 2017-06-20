#! /usr/bin/env node

const querystring = require('querystring')

let method = 'POST'
let args = ''

function getOptions(host, data){
    let protocol = 'http'
    let port = '80'
    let path = ''
    // get protocol
    hostParts = host.split('://') 
    if(hostParts.length > 1){
        protocol = hostParts[0]
        host = hostParts[1]
    }
    else{
        protocol = 'http'
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
            path = ''
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

/*
console.log(getOptions('http://facebook.com/abc/def'))
console.log(getOptions('http://facebook.com:80/abc/def'))
console.log(getOptions('https://facebook.com/abc/def'))
console.log(getOptions('https://facebook.com:80/abc/def'))
console.log(getOptions('facebook.com'))
*/

if(process.argv.length > 3){
    host = process.argv[2]
    chain = process.argv[3]
    data = querystring.stringify({'input' : process.argv.slice(4)})
    options = getOptions(host, data)
    protocol = options.protocol
    
    const http = protocol == 'https'? require('https'): require('http')
    var httpreq = http.request(options, function (response) {
        response.setEncoding('utf8')
        response.on('data', function (chunk) {
            console.log("body: " + chunk)
        })
        response.on('end', function() {
            console.log('ok')
        })
    })
    httpreq.write(data)
    httpreq.end()
}
