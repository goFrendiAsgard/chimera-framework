module.exports = new Promise((resolve, reject) => {
  try {
    // Sheldon: "The best number is 73. Why? 73 is the 21st prime number. Its mirror, 37, is the 12th and its mirror, 21, is the product of multiplying 7 and 3... and in binary 73 is a palindrome, 1001001, which backwards is 1001001."
    resolve(73)
  } catch (error) {
    reject(error)
  }
})
