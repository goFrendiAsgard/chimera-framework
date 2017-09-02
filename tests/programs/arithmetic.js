function add(n1, n2){
    return n1+n2;
}

function substract(n1, n2){
    return n1-n2;
}

function multiply(n1, n2){
    return n1*n2;
}

function divide(n1, n2){
    return n1/n2;
}

function operation(n1, n2, operator){
    n1 = parseFloat(n1)
    n2 = parseFloat(n2)
    switch(operator){
        case "+" : return add(n1,n2); break;
        case "-" : return substract(n1,n2); break;
        case "*" : return multiply(n1,n2); break;
        case "/" : return divide(n1,n2); break;
    }
}

// This one will be required when imported by using "require"
module.exports = {'operation': function(n1, n2, operator, callback){
    let output = operation(n1, n2, operator)
    callback(output)
}}

// This one will be executed when called from cmd
if(require.main == module){
    var n1 = process.argv[2];
    var n2 = process.argv[3];
    var operator = process.argv[4]
    console.log(operation(n1, n2, operator))
}
