var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');

var fs = require('fs');
var yaml = require('js-yaml');
var chimera = require('chimera/core');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

function createPresets(req){
    var keys = ['params', 'query', 'body', 'baseUrl', 'cookies', 'hostname', 'method', 'protocol', 'subdomains'];
    var presets = {'_req' : {}};
    for(i=0; i<keys.length; i++){
        var key = keys[i];
        presets._req[key] = req[key];
    }
    return presets;
}

// read route.yaml
fs.readFile('route.yaml', function(err, data){

    if(err){
        console.error('[ERROR] yaml contains error');
    }
    else{
        // parse routeConfigs from route.yaml
        var routeConfigs = yaml.safeLoad(data);
        // loop for every verb and every url define in route.yaml
        for(verb in routeConfigs){
            for(url in routeConfigs[verb]){
                // get chain
                var chain = routeConfigs[verb][url]; 
                // add router
                app[verb](url, function(req, res, next){
                    // run chimera
                    chimera.executeYaml(chain, [], createPresets(req), function(output){
                        // show the output directly or render it
                        try{
                            data = JSON.parse(output);
                            if('_view' in data){
                                res.render(data['_view'], data);
                            }
                            else{
                                res.send(output);
                            }
                        }catch(e){
                            res.send(output);
                        }
                    });
                });
            }
        }
    }

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

});

module.exports = app;
