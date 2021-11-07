# nodered2js
 Extracts Function Nodes from a Node Red Flow and writes them into a JS not necessarily executable, but good for versioning and editing

 When executing via terminal do:
 >> node nodered2js.js -r /path/to/flowfile/flows.json -t /path/to/result.js(/.txt/.whatever)

 Where:
 -r , --read -> flowfile to read
 -t, --target -> name of result file

 -You can simply run it without arguments, too.
    Then you have to place the 'flows.json' in './indata'.

 -The name of the flowfile must include 'flow' as a substring.
    e.g. my_superflow_for_NodeRed.json

 -The resulting filename then is 'result(not executable).js' which will be placed in the nodered2js-Folder

 -An existing Result File becomes overwritten!
 
 -The Resultfile will look like this:
 
![resultfileexample](https://user-images.githubusercontent.com/84880723/140642529-032c2a1e-ab2c-42e5-bfb2-2718a6af3398.png)

- The nodeID of the function-node in the flow will be written on top of the function.

-By copy and paste the id you can then find it in you NR-editor.

-The function name is the Title of you function-node.
 Some Characters will be replaced and 'msg' is put as argument for suppressing errors in external editors.

