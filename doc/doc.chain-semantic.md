# YAML chain Semantic

Chimera is a Component Based Software Engineering Framework. In order to define the orchestration of the components, a YAML chain file is required.

All chain file should contains single `Root Process`. The semantic of YAML chain file is specified as follow:

__Note:__ Everything between `[` and `]` are optional, but everything between `<` and `>` are mandatory. For example, a `Root_process` might contains `vars: <Variable_declaration>`. On the other hand, any `vars:` should be followed by `Variable_declaration`

## Root_process

Complete `Root_process` is as follow:

```yaml
[vars: <Variable_declaration>]
[verbose: <Boolean>]
[<Process>]
```

## Boolean

Boolean has two possible value, `true` or `false`

```yaml
true
```

```yaml
false
```

## Variable_declaration

`Variable_declaration` consists of `Variable_name : Value` pairs

```yaml
<Variable_name> : <Value>
<Variable_name> : <Value>
...
```

## Variable_name

Any valid `String` can be used as `Variable_name`

```yaml
<String>
```

## Value

Any valid `String` can be used as `Value`

```yaml
<String>
```

## Process

There are several ways to write `Process`

```yaml
[ins: <Input>]
[out: <Output>]
[mode: <Mode>]
[if: <Condition>]
[chains:
    - <Process>
    - <Process>
    - ...]
[while: <Condition>]
[error: <Condition>]
[error_message: <String>]
[error_action:
    - <Process>
    - <Process>
    - ...]
```

```yaml
[ins: <Input>]
[out: <Output>]
[if: <Condition>]
[<Mode>:
    - <Process>
    - <Process>
    - ...]
[while: <Condition>]
[error: <Condition>]
[error_message: <String>]
[error_action:
    - <Process>
    - <Process>
    - ...]
```

```yaml
[ins: <Input>]
[out: <Output>]
[if: <Condition>]
[Command: <Command>]
[while: <Condition>]
[error: <Condition>]
[error_message: <String>]
[error_action:
    - <Process>
    - <Process>
    - ...]
```

`Process` can also be written in a single line

```yaml
(<Input>) -> <Command> -> <Output>
```

```yaml
(<Input>) -> <Command>
```

```yaml
<Command> -> <Output>
```

```yaml
(<Input>) ->-> <Output>
```

__Note:__ without `Command` specified (i.e: when you use `(<Input>) ->-> <Output>` syntax), the default command will be used (`(...args)=>{if(args.length==1){return args<0>;}else{return args;}}`). Thus the `Input` will be copied into `Output` directly.

## Mode

`Mode` is either `serial` or `parallel`

```yaml
series
```

```yaml
parallel
```

## Condition
Any Javascript that return a `<Boolean>` value.

## Input

`Input` is comma separated `Value` or `Variable_name`.

```yaml
<Variable_name>, <Variable_name>, <Variable_name>, ...
```

```yaml
"<Value>", "<Value>", "<Value>", ...
```

The combination of `Value` and `Variable_name` is also permitted.

```yaml
<Variable_name>, "<Value>", ...
```

## Output

```yaml
<Variable_name>
```

## Command

Any non-interactive command prompt program can be used as `Cmd_command`.
E.g: `cal`, `calc`, `php your-script.php`, `python your-script.py`, `node your-script.js`, etc.

```yaml
Cmd_command
```

Javascript arrow function <https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Functions/Arrow_functions>(https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Functions/Arrow_functions) can be used as `Command`

```yaml
Javascript_arrow_function
```
