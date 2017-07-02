const fs = require('fs')
const chimera = require('chimera/core')
const async = require('async')

const migrationPath = 'migrations/'
const migrationCacheFile = migrationPath + 'migration.json'

migrate(migrationPath, migrationCacheFile)

function migrate(migrationPath, migrationCacheFile){
    // read migrationCacheFile, parse the content into migrationCache (should be array)
    fs.readFile(migrationCacheFile, function(err, data){
        let migrationCache = []
        if(!err){
            try{
                data = JSON.parse(data)
                if(Array.isArray(data)){
                    migrationCache = JSON.parse(data)
                }
            }
            catch(e){
                console.error('[ERROR] '+migrationCacheFile+' doesn\'t contains valid JSON')
            }
        }
        // process all migration files in migrationPath
        processMigrationFiles(migrationPath, migrationCache)
    })
}

function processMigrationFiles(migrationPath, migrationCache){
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
    runMigration(migrationFiles, migrationCache)
}

function runMigration(migrationFiles, migrationCache){
    let failedMigrations = []
    let processList = []
    // populate processList
    for(let i=0; i<migrationFiles.length; i++){
        let migrationFile = migrationFiles[i]
        processList.push((callback) => {
            chimera.executeYaml(migrationPath+'/'+migrationFile, [], {}, function(output, success){
                if(success){
                    // success
                    migrationCache.push(migrationFile)
                    callback(output, false)
                }
                else{
                    // error occurred
                    failedMigrations.push(migrationFile)
                    callback(output, true)
                }
            });
        })
    }
    // run migration sequentially
    async.series(processList, (result, err) => {
        console.info('[INFO] Migration done:')
        console.info(formatArray(migrationCache))
        if(err){
            console.error('[ERROR] Some migration failed:')
            console.error(formatArray(failedMigrations))
        }
        // save cache
        saveCache(migrationCacheFile, migrationCache)
    })
}

function formatArray(array){
    return array.join('\n')
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
            console.info('[INFO] Cache file has been rewriten')
        })
    })
}
