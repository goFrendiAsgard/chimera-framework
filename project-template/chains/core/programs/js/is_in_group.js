var req = JSON.parse(process.argv[2]);
var session = req.session;

// get groups
var groups = []
if('group' in req.params){
    groups = req.params.group;
}
else if(process.argv.length > 3){ 
    groups = JSON.parse(process.argv[3]);
}

if(typeof groups == 'string'){
    groups = [groups];
}
else if(typeof groups != 'object'){
    groups = [];
}

var is_in_group = false;
if ('user_id' in session && session.user_id == 'usr-01'){
    for(i=0; i<groups.length; i++){
        group = groups[i];
        if(group == 'admin' || group == 'super-admin'){
            is_in_group = true;
            break;
        }
    }
}

console.log(JSON.stringify({'is_in_group': is_in_group, 'groups':groups}));
