function add(a, b){
    return a+b
}

function run(a, b, callback){
    callback(add(a,b))
}

module.exports = {
    '_run': run,
    'add' : add,
}
