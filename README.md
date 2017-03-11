# Chimera Framework

Chimera is a nodejs based framework that let you write parts of your processes in different programming languages and run it as a whole.

# Installation

```sh
git clone git@github.com:goFrendiAsgard/chimera.git
npm link
```

# Prerequisites

* nodejs
* npm
* any programming languages you want to use

# Is it working?

The test case is located in `test.sh`, it requires `php`, `python`, and `jdk`.
You will get `-23` is result.

# Example

* Define your chain progress in JSON format

TODO: provide an explanation

```json
{
    "flow"    : [["a", "b"], "f"],
    "series"  : [
        {
            "parallel" : [
                [["a", "b"], "c", "python programs/add.py"],
                {
                    "series": [
                        "javac programs/Substract.java",
                        [["a", "b"], "d", "java -cp programs/ Substract"]
                    ]
                }
            ]
        },
        [["c", "d"], "e", "php programs/multiply.php"],
        [["e", "a"], "f", "node programs/add.js"]
    ]
}
```

* Execute the chain by invoking `chimera your-chain-file 5 1`. This will give you `29`
