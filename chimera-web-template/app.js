var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var session = require('express-session');
var fileUpload = require('express-fileupload');

var fs = require('fs');
var yaml = require('js-yaml');
var chimera = require('chimera/core');

var app = express();

// view engine setup

app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(fileUpload());

function createPresets(req, configs){
    // _req
    var keys = ['params', 'query', 'body', 'baseUrl', 'cookies', 'session', 'files', 'hostname', 'method', 'protocol', 'subdomains'];
    var presets = {'_req' : {}};
    for(i=0; i<keys.length; i++){
        var key = keys[i];
        presets._req[key] = req[key];
    }
    // _configs
    presets._configs = configs;
    return presets;
}

function createRouteHandler(chainObject, configs){
    var chainObject = chainObject;
    return function(req, res, next){
        // run chimera
        chimera.executeYaml(chainObject.chain, [], createPresets(req, configs), function(output){
            // show the output directly or render it
            try{
                data = JSON.parse(output);
                // save cookies
                if('_cookies' in data){
                    for(key in data._cookies){
                        if(key != 'session_id'){
                            res.cookie(key, data._cookies[key]);
                        }
                    }
                }
                // save session
                if('_session' in data){
                    for(key in data._session){
                        if(key != 'cookie'){
                            req.session[key] = data._session[key];
                        }
                    }
                }

                // render response
                req.session.save(function(err){
                    if('view' in chainObject && chainObject.view != ''){
                        res.render(chainObject.view, data);
                    }
                    else{
                        res.send(output);
                    }
                });

            }
            catch(e){
                res.send(output);
            }
        });
    }
}

function processRoutes(routes, configs, callback){
    // loop for every verb and every url define in route.yaml
    for(verb in routes){
        for(url in routes[verb]){
            // get chainObject
            chainObject = routes[verb][url]; 
            if(typeof chainObject == 'string'){
                chainObject = {'chain' : chainObject};
            }
            // add router
            app[verb](url, createRouteHandler(chainObject, configs));
        }
    }
    // run callback
    callback();
}

function createErrorHandler(){
    // catch 404 and forward to error handler
    app.use(function(req, res, next) {
        var err = new Error('Not Found');
        err.status = 404;
        next(err);
    });
    // error handler
    app.use(function(err, req, res, next) {
        // set locals, only providing error in development
        res.locals.message = err.message;
        res.locals.error = req.app.get('env') === 'development' ? err : {};

        // render the error page
        res.status(err.status || 500);
        res.render('error');
    });
}

function getConfigByEnv(configs, key){
    var env = app.get('env');
    if(env + '.' + key in configs){
        return configs[env + '.' + key];
    }
    else if(key in configs){
        return configs[key];
    }
    return '';
}

// read config.yaml
fs.readFile('config.yaml', function(err, configYamlContent){
    // is config.yaml loadable?
    if(err){
        console.error('[ERROR] cannot read config.yaml');
        console.error(err);
    }
    else{
        try{
            var configs = yaml.safeLoad(configYamlContent);

            // settings
            app.use(express.static(path.join(__dirname, getConfigByEnv(configs, 'public_path'))));
            app.use(favicon(path.join(__dirname, getConfigByEnv(configs, 'favicon_path'))));
            app.set('views', path.join(__dirname, getConfigByEnv(configs, 'view_path')));
            app.set('view engine', getConfigByEnv(configs, 'view_engine'));
            app.use(session({
                'secret': getConfigByEnv(configs, 'session_secret'), 
                'resave': getConfigByEnv(configs, 'session_resave'),
                'saveUninitialized': getConfigByEnv(configs, 'session_save_unitialized'),
                'cookie': {'maxAge':getConfigByEnv(configs, 'session_max_age')}
            }));

            // read route.yaml
            fs.readFile('route.yaml', function(err, routeYamlContent){

                if(err){
                    console.error('[ERROR] cannot read route.yaml');
                    console.error(err);
                }
                else{
                    // parse routes 
                    try{
                        var routes = yaml.safeLoad(routeYamlContent);
                        processRoutes(routes, configs, createErrorHandler);
                    }
                    catch(e){
                        console.error('[ERROR] route.yaml contains error');
                        console.error(e);
                    }
                }

            });
        }
        catch(e){
            console.error('[ERROR] config.yaml contains error');
            console.error(e);
        }
    }
});

if(require.main === module){
    var http = require('http');
    var port = process.env.PORT || '3000';
    app.set('port', port);
    var server = http.createServer(app);
    console.log('Run server at port ' + port);
    server.listen(port);
}
module.exports = app;
