// get request
var req = JSON.parse(process.argv[2]);
var configs = JSON.parse(process.argv[3]);

// get name from request
var name = 'name' in req.params ? 
    req.params.name : 
    req.query.name;

// modify session
var session = {};
session.visit = 'visit' in req.session ?
    parseInt(req.session.visit) + 1 :
    0;

// modify cookies
var cookies = {};
cookies.visit = 'visit' in req.cookies ?
    parseInt(req.cookies.visit) + 1 :
    0;

// send JSON response
console.log(JSON.stringify({
    'title' : 'Chimera Web Framework', 
    'name' : name,
    '_cookies' : cookies,
    '_session' : session,
    'configs' : configs
}));
