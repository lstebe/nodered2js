const {readFile, traverseDir} = require("./modules/filer");
const {filepath, extract} = require("./modules/extractor");
const {prettyPrint, filunlink, printFunction, filappend} = require("./modules/printer");

let arguments = process.argv.slice(2);
const argLen = arguments.length;

let foundfiles = [];
let pathes = [];
let resultfile;

if (argLen > 0) {
    for (argIndex = 0; argIndex < argLen;) {
        if (arguments[argIndex] == '-r' || arguments[argIndex] == '--read') {
            argIndex++;
            foundfiles.push(arguments[argIndex]);
        }else if(arguments[argIndex] == '-t' || arguments[argIndex] == '--target'){
            argIndex++;
            resultfile = arguments[argIndex];
        }
        argIndex++;
    }
}else{
    foundfiles = traverseDir('./indata',pathes);
    resultfile = './result(not executable).js';
}
console.log('Found Flowfiles: '+foundfiles);
console.log('Resultfile: '+resultfile);

let filepathes = new filepath(foundfiles);

try{
    flowfilepath = filepathes.getflow();
}catch(e){
console.log('No Flowfile, ERR: '+e)
}
try{
    settingspath = filepathes.getsetting();
}catch(e){
    console.log('No Settingsfile, ERR: '+e)
}

const nodefile = readFile(flowfilepath);

try{
    nodearray = JSON.parse(nodefile);
}
catch(e)
{
    console.log('JSON not parseable, ERR: '+e)
}

let functionnodes = extract(nodearray,'function');
try{
    filunlink(resultfile);
}catch(e){
    //pass
}

for (let node of functionnodes){
    let text = printFunction(node,functionnodes);
    filappend(resultfile,text);
}
console.log("----------We're Done!----------");