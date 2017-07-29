const fs = require('fs')
const chimera = require('chimera-framework/core')
const async = require('async')

const migrationPath = 'migrations/'
const migrationCacheFile = migrationPath + 'migration.json'

// get configs from CLI argument
var configs = {}
if(process.argv.length > 2){
    configs = process.argv[2]
}
// run migration
migrate(migrationPath, migrationCacheFile, configs)

function migrate(migrationPath, migrationCacheFile, configs){
    // read migrationCacheFile, parse the content into migrationCache (should be array)
    fs.readFile(migrationCacheFile, function(err, data){
        let migrationCache = []
        if(!err){
            try{
                data = JSON.parse(data)
                if(Array.isArray(data)){
                    migrationCache = data
                }
            }
            catch(e){
                console.error('[ERROR] '+migrationCacheFile+' doesn\'t contains valid JSON')
            }
        }
        // process all migration files in migrationPath
        processMigrationFiles(migrationPath, migrationCache, configs)
    })
}

function processMigrationFiles(migrationPath, migrationCache, configs){
    // get all the files and sort them
    let allFiles = fs.readdirSync(migrationPath).sort()
    let migrationFiles = []
    for(i=0; i<allFiles.length; i++){
        let fileName = allFiles[i]
        // only process select files with .yaml extension
        if(fileName.match(/^.*\.yaml$/)){
            // if file not in exceptions, add it to selectedFiles
            if(migrationCache.indexOf(fileName) == -1){
                migrationFiles.push(fileName)
            }
        }
    }
    // run all selected files
    runMigration(migrationFiles, migrationCache, configs)
}

function runMigration(migrationFiles, migrationCache, configs){
    let failedMigrations = []
    let succeedMigrations = []
    let processList = []
    // populate processList
    for(let i=0; i<migrationFiles.length; i++){
        let migrationFile = migrationFiles[i]
        processList.push((callback) => {
            chimera.executeYaml(migrationPath+'/'+migrationFile, [configs], {}, function(output, success){
                if(success){
                    // success
                    console.warn(output)
                    succeedMigrations.push(migrationFile)
                    migrationCache.push(migrationFile)
                    callback(output, false)
                }
                else{
                    // error occurred
                    console.error(output)
                    failedMigrations.push(migrationFile)
                    callback(output, true)
                }
            });
        })
    }
    // run migration sequentially
    async.series(processList, (result, err) => {
        // success message
        if(succeedMigrations.length > 0){
            console.warn('[INFO] Migration done:')
            console.warn(formatArray(succeedMigrations))
        }
        // failed message
        if(failedMigrations.length > 0){
            console.error('[ERROR] Some migration failed:')
            console.error(formatArray(failedMigrations))
        }
        // no migration done
        if(succeedMigrations.length == 0 && failedMigrations.length == 0){
            console.warn('[INFO] No migration has been performed')
        }
        // save cache
        if(succeedMigrations.length > 0){
            saveCache(migrationCacheFile, migrationCache)
        }
    })
}

function formatArray(array){
    let arr = []
    for(let i=0; i<array.length; i++){
        arr.push(' - '+array[i])
    }
    return arr.join('\n')
}

function saveCache(migrationCacheFile, migrationCache){
    let fileContent = JSON.stringify(migrationCache)
    fs.open(migrationCacheFile, 'w', function(err, fd) {
        if (err) {
            console.error('[ERROR] Cannot open cache file ' + migrationCacheFile)
            return false
        }
        // no error, now write the file
        fs.writeFile(fd, fileContent, function(err){
            if(err){
                console.error('[ERROR] Migration has been done, but cache writing process was failed')
                console.error(err)
                console.error('Please add this content to ' + migrationCacheFile + ':')
                console.error(fileContent)
                return false
            }
            // no error, let user know
            console.warn('[INFO] Cache file has been rewriten')
        })
    })
}
