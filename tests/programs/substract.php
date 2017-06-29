<?php
// process
function substract($n1, $n2){
    return $n1 - $n2;
}

// executor
$n1 = $argv[1];
$n2 = $argv[2];
echo substract($n1, $n2);
