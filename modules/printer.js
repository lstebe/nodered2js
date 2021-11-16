const { resourceUsage } = require("process");
const { getChild } = require("./extractor");

module.exports = {
    prettyPrint:
    function (obj){
        let string  = JSON.stringify(obj, null, 2);
        return string;
    },
    printFunction:
    function (nodeobj,functionnodes){
        const nameregex = RegExp(/[ \s\'\.\"\-+<>*\/]/g);
        let name = nodeobj.name.replace(nameregex, '_').toLowerCase();//.replace(/\'/g, '_').replace(/\./g,'_');
        let id = nodeobj.id;
        let printcalled = ';'
        /*
        let calledfunctions = getChild(id,functionnodes);
        printcalled = '\n';
        for (let funobj of calledfunctions){
            printcalled += funobj.name.replace(/\s/g ,'_').replace("/'/g",'_')+'(msg);';
            printcalled += '\n';
        }
        //*/
        let nodetext = nodeobj.func.replace(/\"/g,'"');
        nodetext = '\t'+nodetext.replace(/\n/g, '\n\t');
        //nodetext = nodetext.substr(0,nodetext.lastIndexOf('result')) + printcalled + nodetext.substr(nodetext.lastIndexOf('return'));
        let start = `//id:${id}\nfunction ${name}(msg){\n`;
        let end = '\n}\n\n\n';
        return start+nodetext+end;
    },
    filappend:
    function (path,line){
        const fs = require('fs');
        try{
            fs.appendFileSync(path,line);
            return true;
        }catch (e){
            return false;
        }
    },
    filunlink:
    function (path){
        const fs = require('fs');
        fs.unlinkSync(filePath);
        return;
    }
}