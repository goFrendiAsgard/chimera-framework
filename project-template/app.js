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
    'migration_chain': 'chains/core.migration.yaml'
}

const DEFAULT_CHAIN_OBJECT = {
    'host' : '.*',
    'access' : ['_everyone'],
    'chain' : ''
}

const DEFAULT_USER_INFO = {
    'user_id' : null,
    'user_name' : null,
    'groups' : [],
}

const REQ_KEYS = ['params', 'query', 'body', 'baseUrl', 'cookies', 'session', 'files', 'hostname', 'method', 'protocol']

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
const chimera = require('chimera-framework/core')
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
    chimera.executeYaml(chainObject.chain, [shortenRequest(req), CONFIGS], {}, (data, success)=>{
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

function shortenRequest(req){
    let shortReq = {}
    for(let i=0; i<REQ_KEYS.length; i++){
        let key = REQ_KEYS[i]
        shortReq[key] = req[key]
    }
    return shortReq
}

function serveAuthenticatedRoutes(routeHandler){
    serveAllRoutes((req, res, next, chainObject)=>{
        if(inArray(chainObject.access, '_everyone') || (inArray(chainObject.access, '_loggedIn') && inArray(chainObject.access, '_loggedOut'))){
            routeHandler(req, res, next, chainObject) // success
        }
        else{
            process.chdir(CURRENTPATH)
            chimera.executeYaml(CONFIGS.auth_chain, [shortenRequest(req)], [], function(data, success){
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
        // if error, show the message and quit
        if(error){ console.error(error); return false; }
        // setup app (based on CONFIGS), this will only be done once
        setupApp()
        // run migration
        chimera.executeYaml(CONFIGS.migration_chain, [CONFIGS], {}, function(data, success){
            if(success){
                console.warn(data)
                // handle everything here
                app.all('/*', function(req, res, next){
                    let verb = req.method.toLowerCase()
                    // re-load the config and the routes
                    loadConfigsAndRoutes((error, result)=>{
                        // if error, show the message, let the next function handle it and quit
                        if(error){ console.error(error); next(); return false; }
                        // get verbRoute by combining current ROUTES[verb] with ROUTES.all
                        let verbRoute = patchObject(ROUTES[verb], ROUTES.all)
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
                })
                // if everything else failed, show 404
                app.use(show404)
            }
        })
    })
}

function setupApp(){
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
}

function getChainObjectAndParams(req, verbRoute){
    let url = req.path
    for(route in verbRoute){
        let routePattern = getRegexPattern(route)
        let routeMatches = url.match(routePattern) || url.replace(/(.*)\/$/, '$1').match(routePattern)
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
    ROUTES = {}
    CONFIGS = {}
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
                (errorMessage) => {callback(errorMessage);})
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

function deepCopyObject(obj){
    let newObj = {}
    if(typeof obj == 'object'){
        // deep copy, avoiding by-ref call
        newObj = JSON.parse(JSON.stringify(obj))
    }
    return newObj
}

function patchObject(obj, patcher){
    newObj = deepCopyObject(obj)
    patcher = deepCopyObject(patcher)
    // patch
    for(key in patcher){
        if((key in newObj) && !Array.isArray(newObj[key]) && (typeof newObj[key] == 'newObject') && (typeof patcher[key] == 'newObject')){
            // recursive patch for if value type is newObject
            newObj[key] = patchnewObject(newObj[key], patcher[key])
        }
        else{
            // simple replacement if value type is not newObject
            newObj[key] = patcher[key]
        }
    }
    return newObj
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
    chimera.executeYaml(fileName, inputs, presets, function(data, success, errorMessage){
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
