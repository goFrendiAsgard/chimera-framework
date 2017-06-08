const fs = require('fs')
const yaml = require('js-yaml')
const chimera = require('chimera/core')

// add zeros at from the left or right of the string. If mode is not specified, we will fill it from left
function zfill(number, size, mode){
    number = ''+number
    while(number.length < size){
        number = mode == 'right'? (number+'0') : ('0'+number)
    }
    return number
}

// get date in YYYMMDDHHiiss format
function getCurrentDateTime(){
    let date = new Date()
    // get year, month, date, hour, minute, and second
    let year = date.getFullYear()
    let month = date.getMonth()+1
    let day = date.getDate()
    let hour = date.getHours()
    let minute = date.getMinutes()
    let second = date.getSeconds()
    // build up the string and return it
    return zfill(year,4) + zfill(month, 2) + zfill(day, 2) + zfill(hour, 2) + zfill(minute, 2) + zfill(second, 2)
}

function getDefaultDate(inputDate){
    if(inputDate === null){
        // no input date, return current date
        return getCurrentDateTime()
    }
    if(inputDate.length < 14){
        // input date is not complete, add it by 1. So, '2017' will turn into '2018'
        inputDate = parseInt(inputDate)+1
    }
    return zfill(inputDate, 14, 'right')
}


function getConfig(configYamlContent){
    const defaultConfigs = {
        'migration_path' : 'chains/migrations',
        'current_version_chain' : 'chains/core/current_version.yaml',
        'upgrade_version_chain' : 'chains/core/upgrade_version.yaml',
        'downgrade_version_chain': 'chains/core/downgrade_version.yaml',
    }
    // get and completing the configuration
    let configs = yaml.safeLoad(configYamlContent)
    for(key in defaultConfigs){
        if(!(key in configs)){
            configs[key] = defaultConfigs[key]
        }
    }
    // return a complete version of configs
    return configs
}

function processCurrentVersionOutput(inputDate, migrationPath, currentVersionOutput, updateVersionChain){
    try{
        currentVersionOutput = JSON.parse(currentVersionOutput)
        if('current_version' in currentVersionOutput){
            let currentVersion = currentVersionOutput.current_version
            migrate(inputDate, migrationPath, currentVersion, updateVersionChain)
        }
        else{
            console.error('[ERROR] JSON doesn\'t contain current_version key')
        }
    }
    catch(e){
        console.error('[ERROR] Failed to parse JSON')
        console.error(e)
    }
}

function migrate(inputDate, migrationPath, currentVersion, updateVersionChain){
    // get all the files and sort them
    let allFiles = fs.readdirSync(migrationPath).sort()
    let mode = inputDate < currentVersion? 'down' : 'up'
    let selectedFiles = [] 
    console.log(currentVersion)
    for(i=0; i<allFiles.length; i++){
        let fileName = allFiles[i]
        console.log(fileName)
    }
}

// read config.yaml
fs.readFile('config.yaml', function(err, configYamlContent){
    // is config.yaml loadable?
    if(err){
        console.error('[ERROR] cannot read config.yaml')
        console.error(err)
    }
    else{
        try{
            let configs = getConfig(configYamlContent)
            let inputDate = getDefaultDate(process.argv.length > 2? process.argv[2] : null)
            let migrationPath = configs.migration_path
            let currentVersionChain = configs.current_version_chain
            let updateVersionChain = configs.update_version_chain
            chimera.executeYaml(currentVersionChain, [], [], function(currentVersionOutput, success){
                if(success){
                    processCurrentVersionOutput(inputDate, migrationPath, currentVersionOutput, updateVersionChain)
                }
                else{
                    console.error('[ERROR] cannot execute current version chain')
                }
            })
        }
        catch(e){
            console.error('[ERROR] config.yaml contains error')
            console.error(e)
        }
    }
})
