const DEFAULT_CONFIGS = {
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
    'auth_chain' : 'chains/core.auth.yaml',
    'configs_chain' : 'chains/core.configs.yaml',
    'routes_chain' : 'chains/core.routes.yaml',
}

const DEFAULT_CHAIN_OBJECT = {
    'host' : '.*',
    'access' : [],
    'chain' : ''
}

const DEFAULT_USER_INFO = {
    'user_id' : null,
    'user_name' : null,
    'groups' : [],
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
const async = require('async')


const CURRENTPATH = process.cwd()
var app = express()
var CONFIGS = {}
var ROUTES = {}

// uncomment after placing your favicon in /public
app.use(logger('dev'))
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: false }))
app.use(cookieParser())
app.use(fileUpload())
app.use(express.static(path.join(__dirname, 'public')))
app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')))

serveAuthenticatedRoutes((req, res, next, chainObject)=>{
    process.chdir(CURRENTPATH)
    chimera.executeYaml(chainObject.chain, [req, CONFIGS], {}, (data, success)=>{
        if(success){
            if(typeof data == 'object'){
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
                        res.send(data)
                    }
                })
            }
            else{
                res.send(data)
            }
        }
        else{
            show500(req, res, next) // fail to execute chain
        }
    })
})

module.exports = app


// ===================== FUNCTIONS ====================================

function inArray(array, value){
    return array.indexOf(value) > -1
}

function serveAuthenticatedRoutes(routeHandler){
    serveAllRoutes((req, res, next, chainObject)=>{
        if(inArray(chainObject.access, '_everyone') || (inArray(chainObject.access, '_loggedIn') && inArray(chainObject.access, '_loggedOut'))){
            routeHandler(req, res, next, chainObject) // success
        }
        else{
            process.chdir(CURRENTPATH)
            chimera.executeYaml(CONFIGS.auth_chain, [req], [], function(data, success){
                // get userInfo
                let userInfo = patchObject(DEFAULT_USER_INFO, data.userInfo)
                if(success && (typeof userInfo == 'object')){
                    // logged out
                    if(inArray(chainObject.access, '_loggedOut') && userInfo.user_id == null){
                        routeHandler(req, res, next, chainObject) // success
                    }
                    // logged in
                    else if(inArray(chainObject.access, '_loggedIn') && userInfo.user_id != null){
                        routeHandler(req, res, next, chainObject) // success
                    }
                    // authorized
                    else if(userInfo.user_id != null){
                        // check whether user is part of the group or not
                        let authorized = false
                        userInfo.groups.forEach((group) => {
                            if(inArray(chainObject.access, group)){
                                authorized = true
                            }
                        })
                        // show response
                        if(authorized){
                            routeHandler(req, res, next, chainObject) // success
                        }
                        else{ show401(req, res, next); } // Unauthorized
                    }
                    else{ show401(req, res, next); } // Unauthorized
                }
                else{ show500(req, res, next); } // Internal Server Error
            })
        }
    })
}

function serveAllRoutes(routeHandler){
    loadConfigsAndRoutes((error, result)=>{
        if(error){
            console.log(error)
            return false
        }
        // set app based on configs
        app.use(express.static(path.join(__dirname, CONFIGS.public_path)))
        app.use(favicon(path.join(__dirname, CONFIGS.favicon_path)))
        app.set('views', path.join(__dirname, CONFIGS.view_path))
        // pug, handlebars, and ejs are used altogether
        app.engine('pug', engines.pug)
        app.engine('handlebars', engines.handlebars)
        app.engine('ejs', engines.ejs)
        app.engine('jade', engines.jade)
        app.use(session({
            'secret': CONFIGS.session_secret, 
            'resave': CONFIGS.session_resave,
            'saveUninitialized': CONFIGS.session_save_unitialized,
            'cookie': {'maxAge':CONFIGS.session_max_age}
        }))
        // serve the route
        for(verb in ROUTES){
            let verbRoute = ROUTES[verb]
            app[verb]('/*', function (req, res, next) {
                let chainObjectAndParams = getChainObjectAndParams(req, verbRoute)
                let chainObject = chainObjectAndParams.chainObject
                req.params = chainObjectAndParams.params
                if(chainObject != null){
                    // add router
                    routeHandler(req, res, next, chainObject)
                }
                else{
                    next()
                }
            })
        }
        app.use(show404)
    })
}

function getChainObjectAndParams(req, verbRoute){
    let url = req.url
    for(route in verbRoute){
        let routePattern = getRegexPattern(route)
        let routeMatches = url.match(routePattern)
        // the route is match
        if(routeMatches){
            // get chainObject
            let chainObject = verbRoute[route]
            // if chainObject is string, turn it into string
            if(typeof chainObject == 'string'){
                chainObject = {'chain' : chainObject}
            }
            chainObject = patchObject(DEFAULT_CHAIN_OBJECT, chainObject)
            // completing chainObject's accessList
            let accessList = 'access' in chainObject? chainObject.access: ['_everyone']
            if(typeof accessList == 'string'){
                accessList = accessList.split(',')
                for(i=0; i<accessList.length; i++){
                    accessList[i] = accessList[i].trim()
                }
            }
            chainObject.access = accessList
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

function loadConfigsAndRoutes(callback){
    async.parallel([
        prepareConfigs,
        prepareOriginalRoutes,
    ], (error, result) => {
        if(error){
            callback(error)
            return false
        }
        readChainResponse(CONFIGS.routes_chain, [], [], 
            (obj) => {
                // combine CONFIGS and configuration in user-defined chain, patch by environment
                ROUTES = patchObject(ROUTES, obj)
                callback(false)
            }, 
            (errorMessage) => {callback(error)})
    })
}

function prepareConfigs(callback){
    readYaml('config.yaml', 
        // read config success
        (obj) => {
            // combine DEFAULT_CONFIGS and obj, patch by environment
            CONFIGS = patchObject(DEFAULT_CONFIGS, obj)
            CONFIGS = patchConfigsByEnv(CONFIGS)
            // read additional config from user-defined chain
            readChainResponse(CONFIGS.configs_chain, [], [], 
                (obj) => {
                    // combine CONFIGS and configuration in user-defined chain, patch by environment
                    CONFIGS = patchObject(CONFIGS, obj)
                    CONFIGS = patchConfigsByEnv(CONFIGS)
                    callback(false)
                }, 
                (errorMessage) => {callback(errorMessage)})
        },
        // read config failed
        (errorMessage) => {
            callback(errorMessage)
        }
    )
}

function prepareOriginalRoutes(callback){
    readYaml('route.yaml',
        // read route success
        (obj) => {
            ROUTES = obj
            callback(false)
        },
        // read route failed
        (errorMessage) => {
            callback(errorMessage)
        }
    )
}

function patchConfigsByEnv(configs){
    let env = app.get('env')
    let pattern = new RegExp('^' + env + '\.(.*)$')
    for(fullKey in configs){
        let match = fullKey.match(pattern) 
        if(match){
            let key = match[1]
            configs[key] = configs[fullKey]
            delete configs[fullKey]
        }
    }
    return configs
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

function patchObject(obj, patcher){
    for(key in patcher){
        if((key in obj) && (typeof obj[key] == 'object') && (typeof patcher[key] == 'object')){
            // recursive patch for if value type is object
            obj[key] = patchObject(obj[key], patcher[key])
        }
        else{
            // simple replacement if value type is not object
            obj[key] = patcher[key]
        }
    }
    return obj
}

// callbackSuccess should has one parameter containing the parsed object
// callbackError should has one parameter containing error message
function readYaml(fileName, callbackSuccess, callbackError){
    fs.readFile(fileName, function(err, yamlContent){
        if(err){
            callbackError('Cannot read '+fileName)
        }
        else{
            try{
                let obj = yaml.safeLoad(yamlContent)
                callbackSuccess(obj)
            }
            catch(err){
                callbackError('Cannot parse YAML from ' + fileName + '\n' + err)
            }
        }
    })
}

// callbackSuccess should has one parameter containing the parsed object
// callbackError should has one parameter containing error message
function readChainResponse(fileName, inputs, presets, callbackSuccess, callbackError){
    process.chdir(CURRENTPATH)
    chimera.executeYaml(fileName, inputs, presets, function(data, success){
        if(success){
            if(typeof data == 'object'){
                callbackSuccess(data)
            }
            else{
                callbackError('Output of ' + fileName + 'is not a valid object\n' + data)
            }
        }
        else{
            callbackError('Cannot get output of ' + fileName)
        }
    })
}

function show400(req, res, next){
    showErrorResponse(400, 'Bad Request', req, res, next)
}

function show401(req, res, next){
    showErrorResponse(401, 'Unauthorized', req, res, next)
}

function show403(req, res, next){
    showErrorResponse(403, 'Forbidden', req, res, next)
}

function show404(req, res, next){
    showErrorResponse(404, 'Not Found', req, res, next)
}

function show405(req, res, next){
    showErrorResponse(403, 'Method Not Allowed', req, res, next)
}

function show409(req, res, next){
    showErrorResponse(409, 'Conflict', req, res, next)
}

function show500(req, res, next){
    showErrorResponse(500, 'Internal Server Error', req, res, next)
}

function showErrorResponse(statusCode, errorMessage, req, res, next){
    // set locals, only providing error in development
    res.locals.message = statusCode
    console.log(statusCode)
    if(req.app.get('env') === 'development'){
        let err = new Error(errorMessage)
        err.status = statusCode
        res.locals.error = err
    }
    else{
        res.locals.error = {}
    }
    // render the error page
    res.status(statusCode || 500)
    res.render(CONFIGS.error_template)
}


