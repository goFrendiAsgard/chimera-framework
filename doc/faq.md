# FAQ

## Do I need to know Javascript in order to use Chimera-Framework?

It is better if you know some Javascript. But if you don't, you can still use Chimera-Framework by writing some `CHIML` script. The only thing you really need to know is how to install `Node.Js` and `npm`.

## When will I need to know Javascript?

You will use Javascript if you write some `if` or `while` condition. Furthermore, for performance critical operation, you can write your chain in Javascript rather than `CHIML`. Below is the skeleton of Javascript chain:

```javascript
module.exports = (ins, vars, callback) => {
  // do something here
  callback (error, out)
}
```

## Chimera-Framework is using CLI mechanism. Isn't it better to just use UNIX Pipe instead?

This is true for simple processes (e.g: something like `cat | more`). However, once your process need parallel, serial, or conditions, UNIX Pipe can be confusing and intimidating.

Chimera-Framework solve this by let you compose your components in a very readable format

## Why do we need Chimera-Framework if we can write a simple Javascript invoking `childProcess` in order to run a CLI command?

Chimera-Framework is more than just run a CLI commands or another Node modules. CHIML language provide a similar form to handle callback, normal function, and CLI command:

```yaml
do:
  - |(input1, input2) -> {javascriptFunction} -> output
  - |(input1, input2) -> [javascriptCallbackFunction] -> output
  - |(input1, input2) -> <javascriptPromise> -> output
  - |(input1, input2) -> cliCommand -> output
```

Thus, you don't need to change all your legacy script into `Promise object`, and you can escape `callback hell`

## Is Chimera-Framework slower than UNIX Pipe? Why? 

Yes, surely Chimera-Framework run on top of CLI. It doesn't make sense that it is faster than UNIX Pipe mechanism itself

This is a time test for running a single Python program:
```
gofrendi@minastirith:~$ time python function.py "integrate(2*x)" "[-2,-1,0,1,2,3]" && time chimera "(a,b) -> python function.py" "integrate(2*x)" "[-2,-1,0,1,2,3]"
[4, 1, 0, 1, 4, 9]

real    0m0.319s
user    0m0.284s
sys     0m0.032s
[4,1,0,1,4,9]

real    0m0.565s
user    0m0.556s
sys     0m0.024s
```

And this is a time test for piping Python and Node.Js program:
```
gofrendi@minastirith:~$ time node mean.js "$(python function.py "integrate(2*x)" "[-2,-1,0,1,2,3]")" && time chimera "{\"ins\":[\"a\",\"b\"], \"do\":[\"(a,b) -> python function.py -> c\", \"(c) -> node mean.js\"]}" "integrate(2*x)" "[-2,-1,0,1,2,3]"
3.1666666666666665

real    0m0.426s
user    0m0.380s
sys     0m0.040s
3.1666666666666665

real    0m0.658s
user    0m0.596s
sys     0m0.068s
```

The difference was around 200 ms. This is quite significant for critical purpose processes. Chimera-Framework uses `safeEval` and `require` mechanism. Both are badly impact the performance in trade of flexibility.

# 200 ms difference is huge in web application. Is it still worth to build a web application by using Chimera-Framework?

Web application executed once and will always available in the memory. Thus, the performance for each request won't be affected.

Also, for critical processes in Chimera-Web-Framework, we use Javascript instead of CHIML. And since there is no `SafeEval` being used, the performance is good enough. (Mostly 200-something ms for CRUD)

# Can I contribute? Is there any standard for contribution?

We use `js standard` and 2 spaces. That's all. If you work with tabs or 4 spaces, please convert it back to 2 spaces before submit a pull request.

# It doesn't work

Open an issue [here](https://github.com/goFrendiAsgard/chimera-framework/issues)
