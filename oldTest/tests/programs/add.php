<?php
// process
function add($n1, $n2){
    return $n1 + $n2;
}

// executor
$n1 = $argv[1];
$n2 = $argv[2];
echo add($n1, $n2);
