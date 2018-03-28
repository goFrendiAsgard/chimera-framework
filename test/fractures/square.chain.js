module.exports = (ins, vars, callback) => {
  let number = ins[0]
  callback(null, number * number)
}
