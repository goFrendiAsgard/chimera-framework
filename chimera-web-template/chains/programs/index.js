// File: chains/programs/index.js

// get request
var req = JSON.parse(process.argv[2]);

// get name from request
var name = 'Stranger';
if('name' in req.params){
    name = req.params.name;
}
else{
    name = req.query.name;
}

var response = {
    '_view' : 'index', 
    'title' : 'Chimera Web Framework', 
    'name' : name
};
console.log(JSON.stringify(response));
