// this is the default configuration values, should be overridden by modify config.yaml
const defaultConfigs = {
    'mongo_url' : '',
    'public_path' : 'public',
    'migration_path' : 'chains/migrations',
    'favicon_path' : 'public/favicon.ico',
    'view_path' : 'views',
    'error_template' : 'error.pug',
    'session_secret' : 'mySecret',
    'session_max_age': 600000,
    'session_save_unitialized' : true,
    'session_resave' : true,
    'login_validation_chain' : 'chains/core/is_login.yaml',
    'group_validation_chain' : 'chains/core/is_in_group.yaml',
    'group_list_chain' : 'chains/core/group_list.yaml',
    'route_list_chain' : 'chains/core/route_list.yaml',
    'current_version_chain' : 'chains/core/current_version.yaml',
    'upgrade_version_chain' : 'chains/core/upgrade_version.yaml',
    'downgrade_version_chain': 'chains/core/downgrade_version.yaml',
}

const express = require('express')
const path = require('path')
const favicon = require('serve-favicon')
const logger = require('morgan')
const cookieParser = require('cookie-parser')
const bodyParser = require('body-parser')
const session = require('express-session')
const fileUpload = require('express-fileupload')
const engines = require('consolidate')

const fs = require('fs')
const yaml = require('js-yaml')
const chimera = require('chimera/core')

var app = express()
var globalErrorTemplate = defaultConfigs.error_template

// view engine setup

app.use(logger('dev'))
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: false }))
app.use(cookieParser())
app.use(fileUpload())

// This function shall add presets value to the process.
function createPresets(req, configs){
    // _req
    var keys = ['params', 'query', 'body', 'baseUrl', 'cookies', 'session', 'files', 'hostname', 'method', 'protocol']
    var presets = {'_req' : {}}
    for(i=0; i<keys.length; i++){
        var key = keys[i]
        presets._req[key] = req[key]
    }
    // _configs
    presets._configs = configs
    return presets
}

// This will show the correct response assuming authorization goes right
function showResponse(chainObject, configs, req, res){
    chimera.executeYaml(chainObject.chain, [], createPresets(req, configs), function(output, success){
        // show the output directly or render it
        try{
            data = JSON.parse(output)
            // save cookies
            if('_cookies' in data){
                for(key in data._cookies){
                    if(key != 'session_id'){
                        res.cookie(key, data._cookies[key])
                    }
                }
            }
            // save session
            if('_session' in data){
                for(key in data._session){
                    if(key != 'cookie'){
                        req.session[key] = data._session[key]
                    }
                }
            }
            // render response
            req.session.save(function(err){
                if('view' in chainObject && chainObject.view != ''){
                    res.render(chainObject.view, data)
                }
                else{
                    res.send(output)
                }
            })
        }
        catch(e){
            res.send(output)
        }
    })
}

function getLoginStatus(jsonResponse){
    let isLogin = false
    try{
        response = JSON.parse(jsonResponse)
        isLogin = 'is_login' in response? response.is_login: false
    }catch(err){
        console.error('[ERROR] Failed to parse JSON')
        console.error(err)
    }
    return isLogin
}

function createRouteHandler(chainObject, configs){
    return function(req, res, next){
        // get accessList
        let accessList = chainObject.access 
        // create presets
        var presets = createPresets(req, configs)
        // check login status
        chimera.executeYaml(configs.login_validation_chain, [], presets, function(output, success){

            // get login status
            let isLogin = getLoginStatus(output)

            // if _everyone or _loggedIn or _loggedOut
            for(i=0; i<accessList.length; i++){
                let access = accessList[i]
                if((access == '_everyone') || (access == '_loggedIn' && isLogin) || (access == '_loggedOut' && !isLogin)){
                    // show correct response and exit from this function
                    showResponse(chainObject, configs, req, res)
                    return true
                }
            }

            if(isLogin){
                // check group membership 
                chimera.executeYaml(configs.group_validation_chain, [presets._req, accessList], [], function(output, success){
                    if(success){
                        try{
                            response = JSON.parse(output)
                            isInGroup = 'is_in_group' in response? response.is_in_group: false
                            if(isInGroup){
                                // logged in and is in group
                                showResponse(chainObject, configs, req, res)
                                return true
                            }
                        }catch(err){
                            console.error('[ERROR] Failed to parse JSON')
                            console.error(e)
                            show403(req, res, next)
                        }
                    }
                    // failed to get response
                    show403(req, res, next)
                })
            }
            else{
                // not logged in and not permitted to access the page
                show403(req, res, next)
            }
        })
    }
}

function showError(err, req, res, next){
    // set locals, only providing error in development
    res.locals.message = err.message
    res.locals.error = req.app.get('env') === 'development' ? err : {}

    // render the error page
    res.status(err.status || 500)
    res.render(globalErrorTemplate)
}

function show404(req, res, next){
    let err = new Error('Not Found')
    err.status = 404
    showError(err, req, res, next)
}

function show403(req, res, next){
    let err = new Error('Forbidden')
    err.status = 403
    showError(err, req, res, next)
}

function getConfigByEnv(configs, key){
    var env = app.get('env')
    if(env + '.' + key in configs){
        return configs[env + '.' + key]
    }
    else if(key in configs){
        return configs[key]
    }
    return ''
}

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
        route = '^'+route+'$'
        route = new RegExp(route)
    }
    return route
}

function getParameterNames(route){
    if(typeof route == 'string'){
        route = escapeHyphenAndDot(route)
    }
    let matches = route.match(/:([a-zA-Z_][a-zA-Z0-9_]*)/g) 
    if(matches === null){
        matches = []
    }
    for(i=0; i<matches.length; i++){
        matches[i] = matches[i].replace(':', '')
    }
    return matches
}

function injectAdditionalRoutes(routes, additionalRoutes){
    for(verb in additionalRoutes){
        // if verb in additionalRoutes is not defined in routes, define it
        if(!(verb in routes)){
            routes[verb] = []
        }
        // for each url in additioanRoutes[verb]
        for(url in additionalRoutes[verb]){
            // if url of additionalRoutes[verb] is not defined in routes, add it
            if(!(url in routes[verb])){
                routes[verb][url] = additionalRoutes[verb][url]
            }
        }
    }
    return routes
}

function completeChainObject(chainObject){
    if(typeof chainObject == 'string'){
        chainObject = {'chain' : chainObject}
    }
    if(typeof chainObject == 'object'){
        // complete access
        let accessList = 'access' in chainObject? chainObject.access: ['_everyone']
        if(typeof accessList == 'string'){
            accessList = accessList.split(',')
            for(i=0; i<accessList.length; i++){
                accessList[i] = accessList[i].trim()
            }
        }
        chainObject.access = accessList
        // complete host
        if(!('host' in chainObject)){
            chainObject.host = '.*'
        }
    }
    return chainObject
}

function getChainObjectAndParams(req, verbRoute){
    let url = req.url
    for(route in verbRoute){
        let routePattern = getRegexPattern(route)
        let routeMatches = url.match(routePattern)
        // the route is match
        if(routeMatches){
            let chainObject = completeChainObject(verbRoute[route])
            // get host regex pattern 
            let hostPattern = new RegExp('^' + chainObject.host + '$')
            let hostMatches = req.hostname.match(hostPattern)
            // the host also match
            if(hostMatches){
                let parameterNames = getParameterNames(route)
                let parameters = {}
                for(i=0; i<parameterNames.length; i++){
                    parameters[parameterNames[i]] = routeMatches[i+1]
                }
                return {'chainObject' : chainObject, 'params' : parameters}
            }
        }
    }
    return {'chainObject' : null, 'params' : []}
}

function parseRouteYamlContent(routeYamlContent, configs){
    try{
        let routes = yaml.safeLoad(routeYamlContent)
        chimera.executeYaml(configs.route_list_chain, {}, {}, function(data, success){
            // add additional routes from configs.route_list_chain
            let additionalRoutes = JSON.parse(data) 
            routes = injectAdditionalRoutes(routes, additionalRoutes)
            // create route handler etc
            for(verb in routes){
                let verbRoute = routes[verb]
                app[verb]('/*', function (req, res, next) {
                    let chainObjectAndParams = getChainObjectAndParams(req, verbRoute)
                    let chainObject = chainObjectAndParams.chainObject
                    req.params = chainObjectAndParams.params
                    if(chainObject != null){
                        // add router
                        createRouteHandler(chainObject, configs)(req, res, next)
                    }
                    else{
                        next()
                    }
                })
            }            
            app.use(show404)
        })
    }
    catch(e){
        console.error('[ERROR] route.yaml contains error')
        console.error(e)
    }
}

function parseConfigYamlContent(configYamlContent){
    try{
        // get and completing the configuration
        let configs = yaml.safeLoad(configYamlContent)
        for(key in defaultConfigs){
            if(!(key in configs)){
                configs[key] = defaultConfigs[key]
            }
        }
        globalErrorTemplate = configs.error_template

        // set app based on configs
        app.use(express.static(path.join(__dirname, getConfigByEnv(configs, 'public_path'))))
        app.use(favicon(path.join(__dirname, getConfigByEnv(configs, 'favicon_path'))))
        app.set('views', path.join(__dirname, getConfigByEnv(configs, 'view_path')))
        // pug, handlebars, and ejs are used altogether
        app.engine('pug', engines.pug)
        app.engine('handlebars', engines.handlebars)
        app.engine('ejs', engines.ejs)
        //app.set('view engine', getConfigByEnv(configs, 'view_engine'))
        app.use(session({
            'secret': getConfigByEnv(configs, 'session_secret'), 
            'resave': getConfigByEnv(configs, 'session_resave'),
            'saveUninitialized': getConfigByEnv(configs, 'session_save_unitialized'),
            'cookie': {'maxAge':getConfigByEnv(configs, 'session_max_age')}
        }))

        // read route.yaml
        fs.readFile('route.yaml', function(err, routeYamlContent){
            if(err){
                console.error('[ERROR] cannot read route.yaml')
                console.error(err)
            }
            else{
                parseRouteYamlContent(routeYamlContent, configs)
            }
        })
    }
    catch(e){
        console.error('[ERROR] config.yaml contains error')
        console.error(e)
    }
}

// read config.yaml
fs.readFile('config.yaml', function(err, configYamlContent){
    // is config.yaml loadable?
    if(err){
        console.error('[ERROR] cannot read config.yaml')
        console.error(err)
    }
    else{
        parseConfigYamlContent(configYamlContent)
    }
})

if(require.main === module){
    var http = require('http')
    var port = process.env.PORT || '3000'
    app.set('port', port)
    var server = http.createServer(app)
    console.log('Run server at port ' + port)
    server.listen(port)
}
module.exports = app
