# CHIML-script

`CHIML` is a superset of [YAML](http://yaml.org/). So, any valid `YAML` is also a valid `CHIML`. And as `YAML` itself is a superset of [JSON](http://json.org/), any valid `JSON` is also a valid `CHIML`

The only thing that make `CHIML` diferent from `YAML` is you are allowed to write any string after block delimiter (`|` and `>`). Under the hood, this `|someString` will be translated into `"someString"`. If the string contains `"`, it is going to be automatically escaped, so you don't need to worry about it.

The `CHIML-script` should contain a single `rootChain`.

## CHIML-script Semantic (in JSON)

The semantic of a `CHIML-script` is as follow:

* *rootChain*
    - **{ins:** *ins* **, out:** *out* **, vars:** *vars* **, verbose:** *verbosity* **, if:** *condition*, **do:** *command* **, **while:** *condition* **}**
    - **{ins:** *ins* **, out:** *out* **, vars:** *vars* **, verbose:** *verbosity* **, if:** *condition*, **parallel:** *command* **, **while:** *condition* **}**
    - *chain*
* *chain*
    - **{ins:** *ins* **, out:** *out* **, if:** *condition* **, do:** *command* **, while:** *condition* **}**
    - **{ins:** *ins* **, out:** *out* **, if:** *condition* **, parallel:** *command* **, while:** *condition* **}**
    - **"(** *ins* **)->** *singleCommand* **->** *out* **"**
    - **"** *singleCommand* **->** *out* **"**
    - **"** *ins* **-->** *out* **"**
* *ins*
    - *variableList*
* *out*
    - *variableName*
* *variableList*
    - **[]**
    - **[** *variables* **]**
    - **"** *variables* **"**
* *variables*
    - *variableName*
    - *variableName* **,** *variables*
* *command*
    - *singleCommand*
    - *commandList*
* *singleCommand*
    - *cliCommand*
    - *jsArrowFunction*
    - **"{** *jsFunction* **}"**
    - **"[** *jsFunctionWithCallback* **]"**
    - **"<** *jsPromise* **>"**
* *commandList*
    - **[** *command* **]**
    - **[** *command*, *commandList* **]**
* ***condition***: Javascript statement returning `true` or `false`
* ***variableName***: Valid Javascript variable name
* ***verbosity***: Integer number, `0`, `1`, `2`, `3`, or `4`
* ***cliCommand***: Any valid CLI Command (e.g: `ls`, `python someProgram.py`, `node someProgram.py`, etc)
* ***jsArrowFunction***: Javascript [arrow function](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Functions/Arrow_functions)
* ***jsFunction***: Javascript function returning a value
* ***jsFunctionWithCallback***: Javascript function that has `error-first-callback` (i.e: `function (error, value) {/*...*/}`) as it's last parameter.
* ***jsPromise***: Javascript promise

## Default Variables
There are some default variables in every CHIML script:

* `_chain_cwd`: String, current working directory of CHIML script
* `_process_cwd`: String, current working directory of program that invoike CHIML script
* `_error`: Boolean, error status
* `_error_message`: String, error message
* `_verbose`: Integer, verbosity level
* `_ans`: Default output variable

## Control Flow
Every `chain` has some keys including `ins`, `out`, `if`, `do`, and `while`. The control flow of a `chain` is as follow:

![control-flowchart](img/chimera-control-flowchart.png)

