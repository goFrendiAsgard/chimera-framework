var express = require('express')
var app = express()
var routes = {'/price/:price1/:price2':'', '/hello/:name':'', '/go/:from-:to':''}

function escapeHyphenAndDot(str){
    // hyphen should be translated literally
    str = str.replace(/\-/g, '\\-')
    // dots should be translated literally
    str = str.replace(/\./g, '\\.') 
    return str
}

function getRegexPattern(route){
    // object (including regex pattern) should not be processed
    if(typeof route == 'string'){
        route = escapeHyphenAndDot(route)
        // translate into regex
        route = route.replace(/:[a-zA-Z_][a-zA-Z0-9_]*/g, '([a-zA-Z0-9_]*)')
        route = new RegExp(route)
    }
    return route
}

function getParameterNames(route){
    if(typeof route == 'string'){
        route = escapeHyphenAndDot(route)
    }
    var matches = route.match(/:([a-zA-Z_][a-zA-Z0-9_]*)/g) 
    for(i=0; i<matches.length; i++){
        matches[i] = matches[i].replace(':', '')
    }
    return matches;
}

app.get('/*', function (req, res) {
    var url = req.url
    for(route in routes){
        var re = getRegexPattern(route)
        var matches = url.match(re)
        if(matches){
            var parameterNames = getParameterNames(route)
            var parameters = {}
            for(i=0; i<parameterNames.length; i++){
                parameters[parameterNames[i]] = matches[i+1]
            }
            console.log(url)
            console.log(parameters)
            break
        }
    }
    res.send(req.url)
})

app.listen(3000, function () {
    console.log('Example app listening on port 3000!')
})
