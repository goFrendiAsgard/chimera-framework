#! /usr/bin/env node
'use strict';

let async = require('async')
let fs = require('fs')
let clone = require('clone')
let cmd = require('./cmd')
let yaml = require('js-yaml')
let stringify = require('json-stringify-safe')

// run the callback (if present) and return the output
function runCallbackAndReturn(callback, output, success=true, errorMessage=''){
    if(typeof(callback) == 'function'){
        callback(output, success, errorMessage)
    }
    return output
}

function sliceString(string, limit, callback){
    if(string.length > limit-4){
        string = string.substring(0, limit-4) + '...'
    }
    return runCallbackAndReturn(callback, string)
}

function stretchString(string, length, filler='.', callback){
    while(string.length < length){
        string += filler
    }
    return runCallbackAndReturn(callback, string)
}


/**
 * Preprocess dirPath by adding '/' at the end of dirPath
 * Example:
 *  addTrailingSlash('dir/anotherDir')
 *  addTrailingSlash('dir/anotherDir/')
 * Output:
 *  'dir/anotherDir/'
 *
 * @param {string} dirPath
 */
function addTrailingSlash(dirPath, callback){
    if(dirPath.charAt(dirPath.length-1) != '/'){
        dirPath += '/'
    }
    return runCallbackAndReturn(callback, dirPath)
}

/**
 * Execute command if srcFile is newer than dstFile
 * Example:
 *  eisn('Program.java', 'Program.class', 'javac Program.java', function(result, success, errorMessage){
 *     console.log(result)
 *  })
 * Output:
 *  {'is_command_executed' : true}
 *
 * @param {string} srcFile
 * @param {string} dstFile
 * @param {string} command
 * @param {function} callback
 *
 */
function eisn(srcFile, dstFile, command, finalCallback){
    // preprocess finalCallback
    if(!isFunction(finalCallback)){
        finalCallback = function(result, success, errorMessage){
            console.log(JSON.stringify({'result':result, 'success':success, 'errorMessage':errorMessage}))
        }
    }
    // define result
    let result = {'is_command_executed':true}
    let srcStat = null
    async.series([
        // get source fileStat
        (callback) => {
            fs.stat(srcFile, (error, stat) => {
                if(error){
                    // cannot get stat of srcFile, stop here
                    console.error('[ERROR] Cannot get file stat of ' + srcFile)
                    console.error(error)
                    result.is_command_executed = false
                    finalCallback(result, false, error.stack)
                }
                else{
                    srcStat = stat
                    callback()
                }
            })
        },
        // try access destination file
        (callback) => {
            fs.access(dstFile, function(error){
                if(error){
                    // dstFile isn't accessible, assume it doesn't exists, execute the command and stop here
                    cmd.get(command, function(data, success, stderr){
                        if(success){
                            finalCallback(result, true, error.stack)
                        }
                        else{
                            result.is_command_executed = false
                            finalCallback(result, true, error.stack)
                        }
                    })
                }
                else{
                    callback()
                }
            })
        },
        // get destination fileStat
        (callback) => {
            fs.stat(dstFile, function(error, dstStat){
                if(!error && srcStat.mtime > dstStat.mtime){
                    cmd.get(command, function(data, success, stderr){
                        if(success){
                            finalCallback(result, true, error.stack)
                        }
                        else{
                            result.is_command_executed = false
                            finalCallback(result, true, error.stack)
                        }
                    })
                }
                else if(error){
                    result.is_command_executed = false
                    finalCallback(result, true, error.stack)
                }
                else{
                    result.is_command_executed = false
                    finalCallback(result, true, '')
                }
            })
        }
    ], (error, result) => {})
}

// this one is for benchamarking
/**
 * Get formatted nano second
 * Example:
 *  formatNanoSecond(process.hrtime())
 * Output:
 *  string, formatted nano second
 */
function formatNanoSecond(time, callback){
    let nano = time[0] * 1e9 + time[1]
    let result = nano.toLocaleString()
    return runCallbackAndReturn(callback, result)
}


// deep copy an object, now using clone rather than JSON.parse(JSON.stringify(obj))
function deepCopy(obj, callback){
    let newObj = clone(obj)
    return runCallbackAndReturn(callback, newObj)
}

// patch object with patcher
function patchObject(obj, patcher, callback){
    obj = deepCopy(obj)
    patcher = deepCopy(patcher)
    // patch
    for(let key in patcher){
        if((key in obj) && isRealObject(obj[key]) && isRealObject(patcher[key])){
            // recursive patch for if value type is object
            obj[key] = patchObject(obj[key], patcher[key])
        }
        else{
            // simple replacement if value type is not object
            obj[key] = patcher[key]
        }
    }
    return runCallbackAndReturn(callback, obj)
}

function smartSplit(string, delimiter, callback){
    let singleQuoteCount = 0
    let doubleQuoteCount = 0
    let data = []
    let word = ''
    for(let i=0; i<string.length; i++){
        let chr = string.charAt(i)
        if(string.substring(i,i+delimiter.length) == delimiter && doubleQuoteCount % 2 == 0 && singleQuoteCount % 2 == 0){
            data.push(word.trim())
            i+= delimiter.length-1
            word = ''
        }
        else{
            if(chr == "'"){
                singleQuoteCount ++
            }
            else if(chr == '"'){
                doubleQuoteCount ++
            }
            word += chr
        }
    }
    data.push(word.trim())
    return runCallbackAndReturn(callback, data)
}

/**
 * quote a string
 * Example:
 *  quote('string')
 * Output:
 *  '"string"'
 *
 * @param {string} string
 */
function quote(string, callback){
    string = string.replace(/"/g, '\\\"')
    string = string.replace(/\n/g, '\\n')
    string = string.trim()
    string = '"'+string+'"'
    return runCallbackAndReturn(callback, string)
}

/**
 * unquote a string
 * Example:
 *  unquote('"string"')
 *  unquote("'string'")
 * Output:
 *  'string'
 *
 * @param {string} string
 */
function unquote(string, callback){
    string = string.trim()
    if(string.match(/^"(.*)"$/g) || string.match(/^'(.*)'$/g)){
        string = string.substring(1, string.length-1)
        string = string.replace(/\\\\/g, '\\')
    }
    return runCallbackAndReturn(callback, string)
}

function isString(value, callback){
    let result = typeof(value) == 'string' || value instanceof String
    return runCallbackAndReturn(callback, result)
}

function isArray(value, callback){
    let result = Array.isArray(value) || value instanceof Array
    return runCallbackAndReturn(callback, result)
}

function isObject(value, callback){
    let result = typeof(value) == 'object' || value instanceof Object
    return runCallbackAndReturn(callback, result)
}

function isRealObject(value, callback){
    let result = !isNullOrUndefined(value) && !isString(value) && !isArray(value) && isObject(value)
    return runCallbackAndReturn(callback, result)
}

function isUndefined(value, callback){
    let result = typeof(value) == 'undefined'
    return runCallbackAndReturn(callback, result)
}

function isNull(value, callback){
    let result = value === null
    return runCallbackAndReturn(callback, result)
}

function isNullOrUndefined(value, callback){
    let result = typeof(value) == 'undefined' || value === null
    return runCallbackAndReturn(callback, result)
}

function isFunction(value, callback){
    let result = typeof(value) == 'function'
    return runCallbackAndReturn(callback, result)
}

function compose(...fns) {
    return function (result) {
        for (let i = fns.length-1; i>=0; i--) {
            result = fns[i].call(this, result)
        }
        return result
    };
};

function replaceKey(obj, oldKey, newKey, callback){
    // using dictionary? parse it recursively
    if(isRealObject(oldKey) && isNullOrUndefined(newKey)){
        let dict = oldKey
        for(let key in dict){
            obj = replaceKey(obj, key, dict[key])
        }
        return runCallbackAndReturn(callback, obj)
    }
    // real action
    if(oldKey in obj){
        obj[newKey] = deepCopy(obj[oldKey])
        delete obj[oldKey]
    }
    return runCallbackAndReturn(callback, obj)
}

function assignDefaultValue(obj, key, value, callback){
    // using dictionary? parse it recursively
    if(isRealObject(key) && isNullOrUndefined(value)){
        let dict = key
        for(let key in dict){
            obj = assignDefaultValue(obj, key, dict[key])
        }
        return runCallbackAndReturn(callback, obj)
    }
    // real action
    if(!(key in obj)){
        obj[key] = value
    }
    return runCallbackAndReturn(callback, obj)
}

function readYaml(yamlFile, callback){
    fs.readFile(yamlFile, function(error, data){
        if(error){
            callback({}, false, error.stack)
        }
        else{
            try{
                let obj = yaml.safeLoad(data)
                callback(obj, true, '')
            }
            catch(error){
                callback({}, false, error.stack)
            }
        }
    })
}

function readJson(jsonFile, callback){
    fs.readFile(jsonFile, function(err, data){
        if(error){
            callback({}, false, error.stack)
        }
        else{
            try{
                let obj = JSON.parse(data)
                callback(obj, true, '')
            }
            catch(error){
                callback({}, false, error.stack)
            }
        }
    })
}

function parseJsonOrYaml(str, callback){
    let obj = {}
    let errorMessage = ''
    let success = true
    try{
        obj = JSON.parse(str)
    }
    catch(jsonError){
        try{
            obj = yaml.safeLoad(str)
        }
        catch(yamlError){
            errorMessage = 'CONTENT: ' + str + '\n'
            errorMessage += 'YAML ERROR: ' + yamlError.stack + '\n'
            errorMessage += 'JSON ERROR: '+jsonError.stack
            success = false
        }
    }
    let result = {'result' : obj, 'success' : success, 'errorMessage' : errorMessage}
    return runCallbackAndReturn(callback, result)
}

function readJsonOrYaml(file, callback){
    fs.readFile(file, function(error, data){
        if(error){
            callback({}, false, error.stack)
        }
        else{
            let parseResult = parseJsonOrYaml(data)
            let obj = parseResult.result
            let success = parseResult.success
            let errorMessage = parseResult.errorMessage
            callback(obj, success, errorMessage)
        }
    })
}

function writeYaml(yamlFile, obj, callback){
    let content = yaml.safeDump(obj, {skipInvalid :true, noRefs : true})
    fs.writeFile(yamlFile, content, function(error){
        if(error){
            callback(false, error.stack)
        }
        else{
            callback(true, '')
        }
    })
}

function writeJson(jsonFile, obj, callback){
    let content = stringify(obj)
    fs.writeFile(jsonFile, content, function(error){
        if(error){
            callback(false, error.stack)
        }
        else{
            callback(true, '')
        }
    })
}

module.exports = {
    'addTrailingSlash' : addTrailingSlash,
    'eisn' : eisn,
    'formatNanoSecond' : formatNanoSecond,
    'deepCopy' : deepCopy,
    'patchObject' : patchObject,
    'smartSplit' : smartSplit,
    'quote' : quote,
    'unquote' : unquote,
    'isString' : isString,
    'isArray' : isArray,
    'isObject' : isObject,
    'isRealObject' : isRealObject,
    'isUndefined' : isUndefined,
    'isNull' : isNull,
    'isNullOrUndefined' : isNullOrUndefined,
    'isFunction' : isFunction,
    'replaceKey' : replaceKey,
    'assignDefaultValue' : assignDefaultValue,
    'compose' : compose,
    'readYaml' : readYaml,
    'readJson' : readJson,
    'parseJsonOrYaml' : parseJsonOrYaml,
    'readJsonOrYaml' : readJsonOrYaml,
    'writeYaml' : writeYaml,
    'writeJson' : writeJson,
    'stretchString' : stretchString,
    'sliceString' : sliceString,
    'runCallbackAndReturn' : runCallbackAndReturn,
}
