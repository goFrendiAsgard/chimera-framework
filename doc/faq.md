# Do I need to know Javascript in order to use Chimera-Framework?

No. You only need to install Node.Js and npm. However, when you want to write some `if`, `while` and native javascript `command`, you should know some basic Javascript.

# Chimera-Framework is using CLI mechanism. Isn't it better to just use UNIX Pipe instead?

In many cases, using Unix Pipe will give you a better performance. However, for complex flow, UNIX Pipe can be confusing and not so readable. Also, it is kind of difficult to implament `global variables` that are accessible from every process. Creating parallel mechanism in UNIX Pipe is also possible, but it also require unnamed pipe and other mechanism.

Chimera-Framework offer a more readable definition of your processes.

# Why do we need Chimera-Framework if we can write a simple Javascript invoking `childProcess` in order to run a CLI command?

First, it is a matter of readability. Writing a Javascript program with a lot of callback or promise might escalate quickly and become hardly readable.

Second, it is a matter of easiness. Chimera-Framework is a collection of useful libraries for common use cases. By using Chimera-Framework you can save you development time and focus on your business process.

# Chimera-Framework slower compared to UNIX Pipe mechanism, is it true? why? and does it matter?

Yes, it is slower. In my machine (intel core i3, 4 GB of Ram) the time execution difference is approximately ~ 250 ms.

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

The 200 ms time is caused by `require` mechanism in Chimera-Framework source code. This mechanism is only executed once and it is not going to be significant if you use Chimera-Framework as web-service or web-application.
