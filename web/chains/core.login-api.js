const jsonwebtoken = require('jsonwebtoken')

module.exports = (ins, vars, callback) => {
  let state = ins[0]
  let $ = vars.$
  let {config, request} = state
  let identity = request.query.user || request.body.user
  let password = request.query.password || request.body.password
  $.helper.mongoExecute('web_users', 'find', {$and: [{_deleted: {$ne: 1}}, {$or: [{username: identity}, {email: identity}]}]}, (error, users) => {
    let response = {
      data: {
        token: '',
        status: 400,
        userMessage: 'Invalid username or password',
        developerMessage: 'Invalid username or password'
      }
    }
    if (users.length > 0) {
      let user = users[0]
      let salt = user.salt
      let hashedObject = $.helper.hashPassword(password, salt)
      if (hashedObject.hashedPassword === user.hashedPassword) {
        let jwtSecret = config.jwtSecret
        let expiresIn = config.jwtExpired
        let auth = $.helper.getLoggedInAuth(user)
        let jwtToken = jsonwebtoken.sign(auth, jwtSecret, {expiresIn})
        let cookies = {}
        cookies[config.jwtTokenName] = jwtToken
        response = {
          cookies,
          auth,
          data: {
            token: jwtToken,
            status: 200,
            userMessage: 'Login success',
            developerMessage: 'Login success'
          }
        }
      }
    }
    callback(error, response)
  })
}
