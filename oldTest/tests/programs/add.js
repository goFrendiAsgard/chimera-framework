function add (n1, n2) {
  n1 = parseFloat(n1)
  n2 = parseFloat(n2)
  return n1 + n2
}

// This one will be required when imported by using "require"
module.exports = (a, b, callback) => {
  let output = add(a, b)
  callback(null, output)
}

// This one will be executed when called from cmd
if (require.main == module) {
  var n1 = process.argv[2]
  var n2 = process.argv[3]
  console.log(add(n1, n2))
}
