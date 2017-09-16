function respond(webConfig, req){
    let params = req['params']
    let title = 'sample.responder.js' 
    let name = 'Kimi no na wa?'
    if('name' in params){
        name = params.name
    }
    return {'title' : title, 'name' : name}
}

module.exports = function(webConfig, req, callback){
    let response = JSON.stringify(respond(webConfig, req)) 
    callback(response)
}

if(require.main == module){
    let webConfig = JSON.parse(process.argv[2])
    let req = JSON.parse(process.argv[3])
    console.log(JSON.stringify(respond(webConfig, req)))
}
