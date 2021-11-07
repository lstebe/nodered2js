# nodered2js
 Extracts Function Nodes from a Node Red Flow and writes them into a JS not necessarily executable, but good for versioning and editing

 When executing via terminal do:
 >> node nodered2js -r /path/to/flowfile/flows.json -t /path/to/result.js(/.txt/.whatever)

 Where:
 -r , --read -> flowfile to read
 -t, --target -> name of result file

 -You can simply run it without arguments, too.
    Then you have to place the 'flows.json' in './indata'.

 -The name of the flowfile must include 'flow' as a substring.
    e.g. my_superflow_for_NodeRed.json

 -The resulting filename then is 'result(not executable).js'

 -An existing ResultFile become overwritten!
