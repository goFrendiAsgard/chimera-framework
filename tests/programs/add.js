// process
function add(n1, n2){
    n1 = parseFloat(n1)
    n2 = parseFloat(n2)
    return n1+n2;
}

function run(a, b, callback){
    let output = add(a,b)
    callback(output)
}


module.exports = {
    '_run': run,
    'add' : add,
}

// executor
if(require.main == module){
    var n1 = process.argv[2];
    var n2 = process.argv[3];
    console.log(add(n1, n2));
}
