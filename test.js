var yaml = require('js-yaml');
var fs = require('fs');

var parameter = process.argv[2];
fs.readFile(parameter, function(err, data){
    var chainConfigs = {};
    if(!err){
        // parameter is a file
        var parameterParts = parameter.split('/');
        if(parameterParts.length > 1){
            // perform chdir if necessary
            var pathParts = parameterParts.slice(0,-1);
            var path = pathParts.join('/');
            process.chdir(path);
        }
        chainConfigs = yaml.safeLoad(data);
    }
    else{
        // parameter is a json, not a file
        chainConfigs = yaml.saveLoad(parameter);
    }
    console.log(JSON.stringify(chainConfigs, null, 2));
});
