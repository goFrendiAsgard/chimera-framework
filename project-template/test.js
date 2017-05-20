const express = require('express')
const app = express()
const routes = {'get': {'/price/:price1/:price2':'', '/hello/:name':'', '/go/:from-:to':''}}

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
    let matches = route.match(/:([a-zA-Z_][a-zA-Z0-9_]*)/g) 
    for(i=0; i<matches.length; i++){
        matches[i] = matches[i].replace(':', '')
    }
    return matches;
}

for(verb in routes){
    app[verb]('/*', function (req, res) {
        let verbRoute = routes[verb]
        let url = req.url
        for(route in verbRoute){
            let re = getRegexPattern(route)
            let matches = url.match(re)
            if(matches){
                let parameterNames = getParameterNames(route)
                let parameters = {}
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
}

app.listen(3000, function () {
    console.log('Example app listening on port 3000!')
})
