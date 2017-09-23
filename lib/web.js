#! /usr/bin/env node
'use strict';

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
let async = require('async')

const DEFAULT_CONFIGS = {
    'mongo_url' : '',
    'public_path' : 'public',
    'migration_path' : 'chains/migrations',
    'migration_cache_file' : 'chains/migrations/migration.json',
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


function createApp(configs, routes){
    let app = express()

    app.use(logger('dev'))
    app.use(bodyParser.json())
    app.use(bodyParser.urlencoded({ extended: false }))
    app.use(cookieParser())
    app.use(fileUpload())
    app.use(express.static(path.join(__dirname, 'public')))
    app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')))

    return app
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
