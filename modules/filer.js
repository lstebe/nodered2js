module.exports = {
    readFile:
    function readFile(path){
        fs = require("fs");
        file = fs.readFileSync(path);
        return file;
    },
    traverseDir:
    function traverseDir(dir,pathes) {
        fs = require("fs");
        pathes = (typeof pathes !== undefined) ? pathes:[];
        if(dir[dir.length-1]!= "/") dir = dir+"/";
            fs.readdirSync(dir).forEach(file => {
            let fullPath = dir+file;
            if (fs.lstatSync(fullPath).isDirectory()) {
                traverseDir(fullPath,pathes);
            } else {
                //files.push(file.replace(".json",""));
                pathes.push(fullPath)
            }  
       });
       return pathes;
    }
  };