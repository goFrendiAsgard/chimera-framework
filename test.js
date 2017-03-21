const assert = require('assert');
const cmd = require('node-cmd');
const chimera = require('chimera-framework/core');

// assert chain complete
command = 'chimera tests/chain-complete.yaml 1 5';
cmd.get(command, function(data, err, stderr){
    // show command
    console.log(command);
    // data contains several lines
    console.log(data);
    // get the last line
    lines = data.trim().split('\n');
    lastLine = lines[lines.length - 1];
    assert(lastLine == -23, 'test chain-complete failed');

    // assert chain minimal
    command = 'chimera tests/chain-minimal.yaml 1 5';
    cmd.get(command, function(data, err, stderr){
        // show command
        console.log(command);
        // show data
        console.log(data);
        assert(data == -23, 'test chain-complete failed');

        // try to import executeYaml
        chimera.executeYaml('tests/chain-minimal.yaml', [1, 5], {}, function(output){
            console.log('test executeYaml without presets');
            console.log(output);
            assert(output == -23, 'test executeYaml without presets failed');
           
            // try to import executeYaml
            chimera.executeYaml('chain-minimal.yaml', {}, {a:1, b:5}, function(output){
                console.log('test executeYaml with presets');
                console.log(output);
                assert(output == -23, 'test executeYaml with presets failed');
            });

        });

    });

});
