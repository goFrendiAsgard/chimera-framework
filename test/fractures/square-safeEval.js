let safeEval = require('safe-eval')
let number = parseFloat(process.argv[2])
console.log(safeEval('number * number', {number}))
