module.exports = {
    extract:
    function (nodearray,type){
        let output = [];
        for (let node of nodearray){
            if (node.type == type){
                output.push(node)
                }
            }
        return output;
    },
    getChild:
    function (parentid,nodesarr){
        let childs = module.exports.findChilds(parentid,nodesarr);
        let nodes = [];
        for (let child of childs) {
            if (child.id == parentid) {
                nodes.push(child);
            }
        }
        return nodes;
    },
    findChilds:
    function (parentid,nodesarr){
        let childs;
        for (let node of nodesarr){
            if (node.id == parentid) {
                childs = node.wires;
            }
        }
        return childs;
    },
    filepath:
    class filepath{
        constructor (filepatharr) {
            this.all = filepatharr;
        }
        getflow(){
            for (let file of this.all){
                if (file.endsWith('.json') && file.includes('flow')){
                    return file;
                }
            }
        }
        getsetting(){
            for (let file of this.all){
                if (file.endsWith('.js') && file.includes('setting')){
                    return file;
                }
            }
        }
    }
}