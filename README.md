# Chimera Framework

Chimera is a nodejs based framework that let you write parts of your processes in different programming languages and run it as a whole.

# Installation

* From source (require `git`)

```sh
git clone git@github.com:goFrendiAsgard/chimera.git
npm link
```
* Using npm

```sh
npm install --global chimera-framework
```

# Prerequisites

* nodejs
* npm
* any programming languages you want to use

# Is it working?

The test case is located in `test.sh`, it requires `php`, `python`, and `jdk`.
You will get `-23` as result.

# Example

* Define your chain progress in `yaml` format

Let's try to make a chain file to execute `Python`, `Javascript`, `Java`, and `PHP` program to solve a simple math problem


```yaml
# THE MAIN PROCESS:
#   f = ((a+b) * (a-b)) + a
# THE SUBPROCESSES:
#   Process 1: c = a + b (we will use Python)
#   Process 2: d = a - b (we will use Java)
#   Process 3: e = c * d (we will use PHP)
#   Process 4: f = e + a (we will use javascript)
# THE FLOW:
# Process 1 and Process 2 will be executed in parallel since they both aren't depend to each another
# After Process 1 and Process 2 finished, Process 3 and Process 4 should be executed in serial 
# as Process 3 depend on both Process 1 and 2, and Process 4 depend on Process 3

ins: a,b # The inputs of main process
out: f # The outputs of main process
series:
  # Process 1 and 2
  - parallel:
      # Process 1 (in Python)
      - ins: a, b
        out: c
        command: python programs/add.py
      - mode: series
        chains:
          # Compile Substract.java into Substract.class
          - javac programs/Substract.java
          # Process 2 (in Java)
          - ins: a, b
            out: d
            command: java -cp programs Substract
  # Process 3 (in PHP)
  - ins: c, d
    out: e
    command: php programs/multiply.php
  # Process 4 (in Javascript)
  - ins: e, a
    out: f
    command: node programs/add.js
```

* Execute the chain by invoking `chimera your-chain-file 5 1`. This will give you `29`
