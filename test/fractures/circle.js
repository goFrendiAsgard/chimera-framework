let circle = (callback) => { callback(null, 'string from circle.js') }
circle.area = (r, callback) => { callback(null, 0.5 * Math.PI * r * r) }

module.exports = circle
