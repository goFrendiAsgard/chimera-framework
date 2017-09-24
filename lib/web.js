#! /usr/bin/env node
'use strict';

let async = require('async')
let express = require('express')
let path = require('path')
let favicon = require('serve-favicon')
let logger = require('morgan')
let cookieParser = require('cookie-parser')
let bodyParser = require('body-parser')
let session = require('express-session')
let fileUpload = require('express-fileupload')
let engines = require('consolidate')
let fs = require('fs')
let yaml = require('js-yaml')
let core = require('./core.js')
let util = require('./util.js')

const DEFAULT_STATE = {
    'mongoUrl' : '',
    'staticPath' : util.addTrailingSlash(process.cwd()) + '/public',
    'faviconPath' : util.addTrailingSlash(process.cwd()) + '/public/favicon.ico',
    'viewPath' : util.addTrailingSlash(process.cwd()) + 'views',
    'defaultTemplate' : null,
    'errorTemplate' : null,
    'sessionSecret' : 'dbbd821f0f40735ca5c2e03ad93bc79b',
    'sessionMaxAge': 600000,
    'sessionSaveUnitialized' : true,
    'sessionResave' : true,
    'startupHook' : null, // Input: state. output: state
    'beforeRequestHook' : null, // Input: state. output: state
    'afterRequestHook' : null, // Input: state. output: state
    'routes' : {},
}

const DEFAULT_REQUEST = {
    'query' : {},
    'body' : {},
    'baseUrl' : {},
    'cookies' : {},
    'session' : {},
    'files' : {},
    'params' : [],
    'hostname' : '',
    'method' : 'get',
    'protocol' : 'http',
    'url' : '',
}

const DEFAULT_RESPONSE = {
    'response' : '',
    'view' : '',
    'session' : {},
    'cookies' : {},
    'status' : 200,
    'errorMessage' : '',
}

const DEFAULT_ROUTE = {
    'route' : '',
    'method' : 'all',
    'chain' : '',
    'view' : '',
}

function escapeRoute(str){
    // hyphen should be translated literally
    str = str.replace(/\-/g, '\\-')
    // dots should be translated literally
    str = str.replace(/\./g, '\\.')
    return str
}

function buildRoutePattern(route){
    // object (including regex pattern) should not be processed
    if(typeof route == 'string'){
        let str = escapeRoute(route)
        // translate into regex
        str = str.replace(/:[a-zA-Z_][a-zA-Z0-9_]*/g, '([a-zA-Z0-9_]*)')
        str = '^'+str+'$'
        let regex = new RegExp(str)
        return regex
    }
    return route
}

function extractParameterNames(route){
    if(typeof route == 'string'){
        route = escapeRoute(route)
    }
    let matches = route.match(/:([a-zA-Z_][a-zA-Z0-9_]*)/g)
    if(matches === null){
        matches = []
    }
    for(let i=0; i<matches.length; i++){
        matches[i] = matches[i].replace(':', '')
    }
    return matches
}

function isRouteMatch(route, url){
    let result = false
    if(getRouteMatches(route, url)){
       return true 
    }
    return false
}

function getRouteMatches(route, url){
    let routePattern = buildRoutePattern(route)
    return url.match(routePattern) || url.replace(/(.*)\/$/, '$1').match(routePattern)
}

function getParameters(route, url){
    let routeMatches = getRouteMatches(route, url) 
    let parameterNames = extractParameterNames(route)
    let parameters = {}
    for(let i=0; i<parameterNames.length; i++){
        let parameterName = parameterNames[i]
        parameterList[parameterName] = routeMatches[i+1]
    }
    return parameters
}

function addAppMiddleWare(app, webConfig){
    app.use(logger('dev'))
    app.use(bodyParser.json())
    app.use(bodyParser.urlencoded({ extended: false }))
    app.use(cookieParser())
    app.use(fileUpload())
    try{
        app.use(express.static(webConfig.staticPath))
        app.use(favicon(webConfig.faviconPath))
    }
    catch(error){
    }
    try{
        app.set('views', webConfig.viewPath)
    }
    catch(error){
    }
    // pug, handlebars, and ejs are used altogether
    app.engine('pug', engines.pug)
    app.engine('handlebars', engines.handlebars)
    app.engine('ejs', engines.ejs)
    app.use(session({
        'secret': webConfig.sessionSecret,
        'resave': webConfig.sessionResave,
        'saveUninitialized': webConfig.sessionSaveUnitialized,
        'cookie': {'maxAge':webConfig.sessionMaxAge}
    }))
    return app
}

function packRequest(req){
    let packedReq = {}
    for(let key in DEFAULT_REQUEST){
        packedReq[key] = req[key]
    }
    return packedReq
}

function composeWebState(webConfig, request){
    let config = util.patchObject(DEFAULT_STATE, webConfig)
    delete config['beforeRequestHook']
    delete config['afterRequestHook']
    return {
        'config' : config, 
        'request' : packRequest(request),
        'response' : DEFAULT_RESPONSE
    }
}

function createHookProcessor(hookKey, hookErrorMessage){
    return function(webConfig, state, callback){
        console.error(hookKey)
        let hook = webConfig[hookKey]
        if(util.isRealObject(hook)){
            console.error(state)
            // hook is object. Use it to patch current state
            let newState = hook
            state = util.patchObject(state, newState)
            callback(state)
        }
        else if(util.isFunction(hook)){
            // hook is function. Execute it, and use the return value to patch current state
            let newState = hook(state)
            state = util.patchObject(state, newState)
            callback(state)
        }
        else if(util.isString(hook)){
            core.executeChain(hook, [state], function(newState, success, errorMessage){
                if(success){
                    state = util.patchObject(state, newState)
                }
                else{
                    state.response.status = 500
                    state.response.errorMessage = hookErrorMessage 
                    console.error(errorMessage)
                }
                callback(state)
            })
        }
        else{
            // hook is neither object nor string. Pass on the current state 
            callback(state)
        }
    }
}

function chainProcessor(webConfig, state, callback){
    let routeObjList = state.config.routes
    let url = state.request.url
    let found = false
    for(let i=0; i<routeObjList.length; i++){
        let routeObj = routeObjList[i]
        if(routeObj.method == 'all' || routeObj.method == state.request.method){
            let route = routeObj.route
            console.error(route + ' ' + url)
            if(isRouteMatch(route, url)){
                let chain = routeObj. 
                state.params = getParameters(route, url)
                found = true
                core.executeChain(chain, [state], function(newResponse, success, errorMessage){
                    if(success){
                        if(!util.isRealObject(newResponse)){
                            newResponse = {'response' : string(newResponse)}
                        }
                        state.response = util.patchObject(state.response, newResponse)
                    }
                    else{
                        state.response.status = 500
                        state.response.errorMessage = 'Unable to process chain' 
                        console.error(errorMessage)
                    }
                    callback(state)
                })
            }
            break
        }
    }
    if(!found){
        state.response.status = 404
        state.response.errorMessage = 'Not Found'
        callback(state)
    }
}

function finalProcess(request, response, state){
    let responseStatus = state.response.status
    let responseErrorMessage = state.response.errorMessage
    if(responseStatus == 200){
        // save cookies
        if('cookies' in state){
            for(let key in state.cookies){
                if(key != 'sessionid'){
                    response.cookie(key, state.cookies[key])
                }
            }
        }
        // save session
        if('session' in state){
            for(let key in state.session){
                if(key != 'cookie'){
                    request.session[key] = state.session[key]
                }
            }
        }
        // render response
        request.session.save(function(err){
            if('view' in state.response && state.response.view != ''){
                response.render(state.response.view, state)
            }
            else{
                response.send(state.response.response)
            }
        })
    }
    else{
        showError(responseStatus, responseErrorMessage, request, response)
    }
}

function createResponder(webConfig){
    let startupProcessor = createHookProcessor('startupHook', 'Unable to process startup hook')
    let beforeRequestProcessor = createHookProcessor('beforeRequestHook', 'Unable to process beforeRequest hook')
    let afterRequestProcessor = createHookProcessor('afterRequestHook', 'Unable to process afterRequest hook')
    return (request, response, next) => {
        // initiate state and newState processor 
        let state = composeWebState(webConfig, request)
        function createProcessor(hookProcessor){
            return (callback)=>{ hookProcessor(webConfig, state, function(newState){
                // change the state
                state = newState
                console.error(state)
                // proceed if response status is 'OK'. Otherwise, show error
                if(state.response.status == 200){
                    callback();
                }
                else{
                    finalProcess(request, response, state)
                }
            })}
        }
        // process
        async.series([
            // startupRequest 
            createProcessor(startupProcessor),
            // process chain
            (callback)=>{ chainProcessor(webConfig, state, function(newState){
                state = newState
                callback()
            })},
            // beforeRequest 
            createProcessor(beforeRequestProcessor),
            // afterRequest 
            createProcessor(afterRequestProcessor),
        ], (error, result)=>{
            finalProcess(request, response, state)
        })
    }
}

function createApp(webConfig){
    webConfig = util.patchObject(DEFAULT_STATE, webConfig)
    console.error(webConfig)
    let app = addAppMiddleWare(express(), webConfig)
    // inject webConfig to app
    app.webConfig = webConfig
    let responder = createResponder(webConfig)
    // serve route
    app.all('/*', responder)
    // show 404 if no response
    app.use(show404)
    // again, put webConfig
    return app
}

function show400(req, res, next){
    showError(400, 'Bad Request', req, res, next)
}

function show401(req, res, next){
    showError(401, 'Unauthorized', req, res, next)
}

function show403(req, res, next){
    showError(403, 'Forbidden', req, res, next)
}

function show404(req, res, next){
    showError(404, 'Not Found', req, res, next)
}

function show405(req, res, next){
    showError(403, 'Method Not Allowed', req, res, next)
}

function show409(req, res, next){
    showError(409, 'Conflict', req, res, next)
}

function show500(req, res, next){
    showError(500, 'Internal Server Error', req, res, next)
}

function showError(statusCode, errorMessage, req, res, next){
    if(!util.isNullOrUndefined(req.app.webConfig.errorTemplate)){
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
        res.render(req.app.webConfig.errorTemplate)
    }
    else{
        res.send(String(errorMessage))
    }
}

module.exports = {
    'createApp' : createApp,
    'showError' : showError,
}
