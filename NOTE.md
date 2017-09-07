# Developer's Note
This note is intended for developers. You might not need it

## Install locally
* `./install-linux.sh`

## Updating
* Update dependencies
    - `ncu -u`
    - `cd project-template`
    - `ncu -u`
    - `cd ..`
* Update version
    - `vim package.json`
    - Change the `version` key
    - `vim project-template/package.json`
    - Change the `dependencies/chimera-framework` version key

## Testing
* Testing Chimera:
    - `npm test`
* Testing Web Framework (__TODO:__ Create a better test)
    - `cd project-template`
    - `npm start`
    - Test manually

## Publish
* Commit and push git
    - `git add . -A`
    - `git commit -m 'commit description'`
    - `git push -u origin master`
* `sudo npm publish`

## Todo
* [x] Simpler error handling (i.e: introduce `error:`, `error_message:`, and `error_action` into YAML semantic)
* [x] Add testing for error handling
* [x] More robust migration and CRUD
* [x] Better performance
* [x] Implementing chimera's own cmd (with `options` parameter) to replace `node-cmd`
* [x] Get rid of `process.chdir`, use options instead
* [ ] Create test for `chimera.executeChain` with different amount of parameters
* [ ] Add usage to Core API documentation
* [ ] Create Mongo db driver API documentation
* [ ] Completing CCK
