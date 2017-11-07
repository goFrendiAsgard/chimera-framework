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

## Publish
* Commit and push git
    - `git add . -A`
    - `git commit -m 'commit description'`
    - `git push -u origin master`
* `sudo npm publish`

## Todo
* [x] Fix getChainWithTrueCommand
* [ ] Find a way to test `chimera.dollar.prompt`
* [ ] Find a way to test `chimera.dollar.print`
* [ ] Find a way to compile `chiml` into `js`
* [ ] Use nunjucks
