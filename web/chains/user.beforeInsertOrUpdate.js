module.exports = (ins, vars, callback) => {
  let cckState = ins[0]
  let $ = vars.$
  // remove password from fieldNames
  let fieldNames = []
  for (let fieldName in cckState.fieldNames) {
    if (fieldName === 'password') { continue }
    fieldNames.push(fieldName)
  }
  cckState.fieldNames = fieldNames
  // add password to unset
  cckState.unset['password'] = '[Not Empty]'
  // hash password(s)
  if ($.util.isRealObject(cckState.data) && 'password' in cckState.data) {
    let hashObject = $.helper.hashPassword(cckState.data.password)
    let {salt, hashedPassword} = hashObject
    cckState.data.hashedPassword = hashedPassword
    cckState.data.salt = salt
  } else if ($.util.isArray(cckState.data)) {
    for (let row of cckState.data) {
      let hashObject = $.helper.hashPassword(row.password)
      let {salt, hashedPassword} = hashObject
      row.hashedPassword = hashedPassword
      row.salt = salt
    }
  }
  callback(null, cckState)
}
