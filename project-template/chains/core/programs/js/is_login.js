var req = JSON.parse(process.argv[2]);
var session = req.session;
if ('user_id' in session && session.user_id != null){
    console.log('{"is_login" : true}');
}
else{
    console.log('{"is_login" : false}');
}
