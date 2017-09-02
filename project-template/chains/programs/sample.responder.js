function respond(req, config){
    let params = req['params']
    let title = 'sample.responder.js' 
    let name = 'Kimi no na wa?'
    if('name' in params){
        name = params.name
    }
    return {'title' : title, 'name' : name}
}

module.exports = function(req, config, callback){
    let response = JSON.stringify(respond(req, config)) 
    callback(response)
}

if(require.main == module){
    let req = JSON.parse(process.argv[2])
    let config = JSON.parse(process.argv[3])
    console.log(JSON.stringify(respond(req, config)))
}
