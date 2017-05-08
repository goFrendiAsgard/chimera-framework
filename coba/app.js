// this is the default configuration values, should be overridden by modify config.yaml
const defaultConfigs = {
    'mongo_url' : '',
    'public_path' : 'public',
    'favicon_path' : 'public/favicon.ico',
    'view_path' : 'views',
    'view_engine' : 'pug',
    'session_secret' : 'mySecret',
    'session_max_age': 600000,
    'session_save_unitialized' : true,
    'session_resave' : true,
    'login_validation_chain' : 'chains/core/is_login.yaml',
    'group_validation_chain' : 'chains/core/is_in_group.yaml',
    'group_list_chain' : 'chains/core/group_list.yaml',
    'route_list_chain' : 'chains/core/route_list.yaml',
}

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

// This function shall add presets value to the process.
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

// This will show the correct response assuming authorization goes right
function showResponse(chainObject, configs, req, res){
    chimera.executeYaml(chainObject.chain, [], createPresets(req, configs), function(output, success){
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

function createRouteHandler(chainObject, configs){
    return function(req, res, next){
        // get accessList
        var accessList = 'access' in chainObject? chainObject.access: ['_everyone'];
        if(typeof accessList == 'string'){
            accessList = accessList.split(',');
            for(i=0; i<accessList.length; i++){
                accessList[i] = accessList[i].trim();
            }
        }

        // create presets
        var presets = createPresets(req, configs);

        // check login status
        chimera.executeYaml(configs.login_validation_chain, [], presets, function(output, success){

            // get login status
            var isLogin = false;
            if(success){
                try{
                    response = JSON.parse(output);
                    isLogin = 'is_login' in response? response.is_login: false;
                }catch(err){
                    console.error('[ERROR] Failed to parse JSON');
                    console.error(e);
                }
            }

            // if _everyone or _loggedIn or _loggedOut
            for(i=0; i<accessList.length; i++){
                var access = accessList[i];
                if((access == '_everyone') || (access == '_loggedIn' && isLogin) || (access == '_loggedOut' && !isLogin)){
                    // show correct response and exit from this function
                    showResponse(chainObject, configs, req, res);
                    return true;
                }
            }

            if(isLogin){
                // check group membership 
                chimera.executeYaml(configs.group_validation_chain, [presets._req, accessList], [], function(output, success){
                    if(success){
                        try{
                            response = JSON.parse(output);
                            isInGroup = 'is_in_group' in response? response.is_in_group: false;
                            if(isInGroup){
                                // logged in and is in group
                                showResponse(chainObject, configs, req, res);
                                return true;
                            }
                        }catch(err){
                            console.error('[ERROR] Failed to parse JSON');
                            console.error(e);
                            show403(req, res, next);
                        }
                    }
                    // failed to get response
                    show403(req, res, next);
                });
            }
            else{
                // not logged in and not permitted to access the page
                show403(req, res, next);
            }
        });
    }
}

function registerRoutes(routes, configs){
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
    // show 404 if no suitable route found
    app.use(show404);
}

function showError(err, req, res, next){
    // set locals, only providing error in development
    res.locals.message = err.message;
    res.locals.error = req.app.get('env') === 'development' ? err : {};

    // render the error page
    res.status(err.status || 500);
    res.render('error');
}

function show404(req, res, next){
    var err = new Error('Not Found');
    err.status = 404;
    showError(err, req, res, next);
}

function show403(req, res, next){
    var err = new Error('Forbidden');
    err.status = 403;
    showError(err, req, res, next);
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

function parseRouteYamlContent(routeYamlContent, configs){
    try{
        var routes = yaml.safeLoad(routeYamlContent);
        chimera.executeYaml(configs.route_list_chain, {}, {}, function(data, success){
            // add additional routes from config.route_list_chain
            var additionalRoutes = JSON.parse(data); 
            for(verb in additionalRoutes){
                // if verb in additionalRoutes is not defined in routes, define it
                if(!(verb in routes)){
                    routes[verb] = [];
                }
                // for each url in additioanRoutes[verb]
                for(url in additionalRoutes[verb]){
                    // if url of additionalRoutes[verb] is not defined in routes, add it
                    if(!(url in routes[verb])){
                        routes[verb][url] = additionalRoutes[verb][url];
                    }
                }
            }
            // create route handler etc
            registerRoutes(routes, configs);
        });
    }
    catch(e){
        console.error('[ERROR] route.yaml contains error');
        console.error(e);
    }
}

function parseConfigYamlContent(configYamlContent){
    try{

        // get and completing the configuration
        var configs = yaml.safeLoad(configYamlContent);
        for(key in defaultConfigs){
            if(!(key in configs)){
                configs[key] = defaultConfigs[key];
            }
        }

        // set app based on configs
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
                parseRouteYamlContent(routeYamlContent, configs);
            }
        });
    }
    catch(e){
        console.error('[ERROR] config.yaml contains error');
        console.error(e);
    }

}

// read config.yaml
fs.readFile('config.yaml', function(err, configYamlContent){
    // is config.yaml loadable?
    if(err){
        console.error('[ERROR] cannot read config.yaml');
        console.error(err);
    }
    else{
        parseConfigYamlContent(configYamlContent);
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
