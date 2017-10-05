function add (a, b) {
  return parseFloat(a) + parseFloat(b)
}

function run (a, b, callback) {
  callback(null, add(a, b))
}

module.exports = {
  '_run': run,
  'add': add
}
