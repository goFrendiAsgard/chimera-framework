# API

Chimera-Framework has several API. The API are accessible from any Node.Js programs. To use the API, you need to add this to your Node.Js application:

```javascript
const chimera = require('chimera-framework')
```

Below are the list of available API

* `chimera.cmd`
    - `get (command, options, callback)`
    - `run (command, options)`
* `chimera.core`
    - `executeChain (chains, ins, vars, callback)`
    - `executeChain (chains, ins, callback)`
    - `executeChain (chains, ins)`
* `chimera.coreChimlParser`
    - `parseChiml (chimlScript, callback)`
* `chimera.coreDollar`
    - `assignValue (value)`
    - `assignValue (value1, value2, value3,... value-N)`
    - `concat (string1, string2, string3,... string-N)`
    - `eisn (srcFile, dstFile, command, callback)`: Alias for `chimera.eisn`
    - `join (array, delimiter)`
    - `merge (array1, array2)`
    - `mongoExecute (dbConfig, functionName, ...args)`: Alias for `chimera.mongo.execute`
    - `loadJs (moduleName, namespace)`
    - `loadJs (moduleName)`
    - `print (value)`
    - `prompt (promptText, callback)`
    - `push (array, value)`
    - `runChain (chain, callback)`
    - `runChain (chain, arg1, arg2, arg3,... arg-N, callback)`
    - `split (value, delimiter)`
    - `send (host, chain, callback)`
    - `send (host, chain, arg1, arg2, arg3,... arg-N, callback)`
    - `util`: Alias for `chimera.util`
* `chimera.corePreprocessor`
    - `getTrueRootChain (chain)`
    - `getTrueRootChain (chain, isStandard)`
* `chimera.eisn (srcFile, dstFile, command, finalCallback)`
* `chimera.mongo`
    - `db (url, dbOption)`
    - `db (dbManager, dbOption)`
    - `db (url)`
    - `db (dbManager)`
    - `collection (dbManager, collectionName, dbOption)`
    - `collection (dbManager, collectionName)`: Returning a `monk` collection instance (`dbCollection`). This instance also has several addtional methods
    - `execute (dbConfig, functionName, ...args)`
* `dbCollection`

  `dbCollection` is basically an extended version of `monk` [Collection class](https://automattic.github.io/monk/docs/collection/). Aside from the original properties and methods, `dbCollection` has several additional methods:
    - `softRemove (query, opts, callback)`
    - `avg (field, filter, groupBy, callback)`
    - `avg (field, filter, callback)`
    - `avg (field, callback)`
    - `min (field, filter, groupBy, callback)`
    - `min (field, filter, callback)`
    - `min (field, callback)`
    - `max (field, filter, groupBy, callback)`
    - `max (field, filter, callback)`
    - `max (field, callback)`
    - `sum (field, filter, groupBy, callback)`
    - `sum (field, filter, callback)`
    - `sum (field, callback)`
* `chimera.sender`
    - `send (host, chain, params, callback)`
* `chimera.server`
    - `serve (options, callback)`
    - `processChain (state, callback)`
* `chimera.util`
    - `getInspectedObject (variables)`
    - `getFilteredObject (obj, exceptionKeys)`
    - `getUnwrapped (string)`
    - `getSlicedString (string, limit)`
    - `getStretchedString (string, length, filler)`
    - `getStretchedString (string, length)`
    - `getDeepCopiedObject (obj)`
    - `getPatchedObject (obj, patcher)`
    - `getSmartSplitted (string, delimiter)`
    - `getQuoted (string)`
    - `getUnquoted (string)`
    - `isString (value)`
    - `isArray (value)`
    - `isObject (value)`
    - `isRealObject (value)`
    - `isUndefined (value)`
    - `isNull (value)`
    - `isNullOrUndefined (value)`
    - `isFunction (value)`
    - `readJsonFile (jsonFile, callback)`
    - `writeJsonFile (jsonFile, obj, callback)`
* `chimera.web`
    - `createApp (webConfig, ...middlewares)`
      
      A middleware can be an `express` middleware function or an object which it's key is the `url` and it's value is `express` middleware function

    - `isRouteMatch (route, urlPath)`
    - `getRouteMatches (route, urlPath)`
    - `getParametersAsObject (route, urlPath)`