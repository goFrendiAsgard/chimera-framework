// process
function add(n1, n2){
    return n1+n2;
}

// executor
var n1 = parseInt(process.argv[2]);
var n2 = parseInt(process.argv[3]);
console.log(add(n1, n2));
