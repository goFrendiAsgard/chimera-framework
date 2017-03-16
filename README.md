# Chimera Framework

Chimera-framework is a nodejs based framework that let you write any task in any language, and combine them for a greater good.

# Motivation

* Most programming languages support command line interface

Perl, python, php, ruby, haskell, javascript, c, java, pascal, R, and even matlab (See http://stackoverflow.com/questions/6657005/matlab-running-an-m-file-from-command-line) are supporting command line interface (CLI). Through CLI, different programs can communicate to each others. Chimera-framework provide mechanism to store global variables and to orchastrate the programs into a single flow.

* Some programming languages are better at some cases while other are excelled at other cases

You might love PHP from the bottom of your heart, but it doesn't change the fact that doing heavy-statistic computation in R is easier. Rather than trying to make PHP do what R do, it is more easier to just use R instead.

* Atomic process

Unix has a great philosophy. It encourage programmers to build a single program to do a single task. Nowadays, people try to make one thing to rule out everything. This might sounds good at first, but the effort will be futile. It is better to keep everything simple and combine those simple process to achieve a greater good.

* Scalability

By creating independent simple programs, you can make a lot of possibility. There is a hero in DOTA named Invoker that can combine his orbs to activate 10 different abilities (http://dota2.gamepedia.com/Invoker#Invoked_abilities). Rather than building a monolithic program that won't scale, it is better to make simple programs, and combine them as you need.

* Less language migration

Sometime you need a certain feature that is only available in an esoteric-new-programming-language. You learn the language, convert all your old projects into this new language, and loosing the meaning of life. Just never do that anymore. Chimera framework goal is to let you write any task in any language, and combine them to achieve a greater good.


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

You can run the test case by running `npm test`. There will be two cases and each of them will yield `-23`

# Example

* Define your chain progress in `yaml` format

Let's try to make a chain file to execute `Python`, `Javascript`, `Java`, and `PHP` program to solve a simple math problem


```yaml
# Location: your-chain-file.yaml
# THE MAIN PROCESS:
#   f = ((a+b) * (a-b)) + a
# THE SUBPROCESSES:
#   Process 1: c = a + b (we will use Python)
#   Process 2: d = a - b (we will use Java)
#   Process 3: e = c * d (we will use PHP)
#   Process 4: f = e + a (we will use javascript)
# THE FLOW:
# Process 1 and Process 2 will be executed in parallel since they both independent to each another
# After Process 1 and Process 2 finished, Process 3 and Process 4 should be executed in serial 
# Process 3 depend on both Process 1 and 2, and Process 4 depend on Process 3

ins: a,b # The inputs of main process
out: f # The outputs of main process
series:
  # Process 1 and 2
  - parallel:
      # Process 1 (in Python)
      - ins: a, b
        out: c
        command: python programs/add.py
      - series: # Process 2 (in Java)
          # First, compile the source 
          - javac programs/Substract.java
          # then run the program
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

* Execute the chain by invoking `chimera your-chain-file.yaml 5 1`. This will give you `29`

# Similar projects, inspirations, and how chimera-framework different from them

* Polyglot (https://github.com/sausheong/polyglot)

In polyglot, single process flow is written in a single programming language. However, you can have a lot of process flows, which each of them can be written in different languages.

In chimera-framework, singe process can be divided into several sub-processes. Every sub-process can be written in different language.

* Beaker notebook (http://beakernotebook.com/)

This one is quite similar to chimera-framework. However, the main purpose of beaker is for prototyping and note-taking. In beaker a cell cannot be used in different notebook. You should copy the cell into another notebook in order to use the same piece of code.

* Invoker (http://dota2.gamepedia.com/Invoker)

A hard-to-master DOTA hero. Not even a framework. Has cool abilities which are combination of 3 orbs.

* Chimera (https://en.wikipedia.org/wiki/Chimera_(mythology))

Legendary creature. Combination of goat, lion, and snake.
