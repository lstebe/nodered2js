//id:cfe970e8.dec84
function Read_incoming_messages(msg){
	/*
	function getLocaleTime(dateobj){ //return corrected summer or wintertime
	    month = dateobj.getMonth();
	    hours = dateobj.getHours();
	    
	    //Between April an Septemer?
	    if (inRangeOf(month,3,8)){
	        dateobj.setHours(++hours);
	        return dateobj;
	    }
	    
	    daydate = dateobj.getDate();
	    day = dateobj.getDay();
	    if (month == 2){ //if in March
	        if (daydate >= 25 && 31 - day > 25){
	            dateobj.setHours(++hours);
	            return dateobj;
	        }
	    }
	    if (month == 9){ //if in October
	        if (daydate >= 25 && 31 - day > 25){
	            return dateobj;
	        }else{
	            dateobj.setHours(++hours);
	            return dateobj;
	        }
	    }
	    return dateobj;
	}
	//*/
	inRangeOf = global.get("LORIDANE.funcs.inRangeOf");
	
	if(msg.topic == "clear"){
	    lastmsgs = ["","","","",""];
	    context.set("lastmsgs",lastmsgs);
	    msg = {payload: lastmsgs};
	    return msg;
	}
	
	pay = msg.data.pay;
	node = msg.data.node;
	rssi = msg.data.rssi;
	now = new Date();//getLocaleTime(new Date());
	lastmsgs = context.get("lastmsgs")||[];
	input = node+" - "+pay +" - RSSI: "+rssi +" - "+ now.toLocaleString('de-DE');
	
	lastmsgs.unshift(input);
	if (lastmsgs.length > 5) lastmsgs.pop();
	context.set("lastmsgs",lastmsgs);
	
	msg = {payload: lastmsgs};
	
	return msg;
}


//id:600536c1.7e8cc8
function gui_show_confirmed(msg){
	if(msg.data.pay == "+")return {topic:"Confirmed by:",payload:msg.data.node};
	return;
}


//id:47d49580.9cf8dc
function Sync(msg){
	//*
	timer = context.get("timer");
	clearTimeout(timer);
	context.set("timer",timer);
	//*/
	
	function countup(secs){
	    timer = context.get("timer");
	    clearTimeout(timer);
	    node.status({text:"Last Sync: "+secs+"s ago"});
	    secs++;
	    timer = setTimeout(countup,1000,secs);
	    context.set("timer",timer);
	}
	
	getUIDGW = global.get("LORIDANE.funcs.getUIDGW");
	gws = getUIDGW();
	
	for (var g in gws){
	    msg = {payload:"cn:sync",topic:"lora/"+gws[g]};
	    node.send(msg);
	}
	node.status({text: "Sync"});
	//*
	timer = setTimeout(countup,1000,0);
	context.set("timer",timer);
	//*/
	//setTimeout(()=>node.status({}),5000);
	return;
}


//id:fa0f21a7.2fba9
function Load_Devices(msg){
	nodes = global.get("LORIDANE.devices.nodes");
	options = [];
	
	// as list for the choose device dropdown load the device an if available the friendlyname
	for (var node in nodes){
	    let name = "";
	    if(nodes[node].friendlyname != "" && nodes[node].friendlyname != undefined){
	        name = `${nodes[node].uid} - ${nodes[node].friendlyname}`;
	        options[node] = {[name]:nodes[node].uid};
	    }else{
	        name = `${nodes[node].uid}`;
	        options[node] = {[name]:nodes[node].uid} ;
	    }
	}
	return {options:options};
}


//id:d643c272.92077
function Join_Configurations(msg){
	nodes = msg.payload;
	if(msg.topic == "nodes"){
	    context.set("nodes",nodes);
	    return;
	}
	
	if(msg.topic == "data"){
	    nodes = context.get("nodes");
	    data = msg.payload;
	    data.freq /= 10;
	    data.sf /= 1; 
	    data.tx /= 1;
	    data.iv *= 1000;
	}
	msg.payload = {nodes:nodes,data:data};
	return msg;
}


//id:a6dcf1a0.330c5
function Validate_Data(msg){
	data = msg.payload.data;
	let topic = true;
	inrange = global.get("LORIDANE.funcs.inRangeOf");
	const timeOnAir = global.get("LORIDANE.values.lastPayloadLens.toa");
	
	if(data.freq === 0){
	    data.freq = global.get("LORIDANE.devices.gw[0].freq") / (1e6);
	}
	
	function allowed(freq){
	    allowedfreq = global.get("LORIDANE.values.allowedFreq");
	    for (i = 0;i < allowedfreq.length;i++){
	        if (inrange(data.freq,allowedfreq[i].min,allowedfreq[i].max)){
	            return {allowed:true, factor:allowedfreq[i].factor};
	        }
	    }
	    return {allowed:false,factor:Infinity};
	}
	
	validated = false;
	keys = Object.keys(data);
	cause = "";
	
	for(var key of keys){
	    validated = false;
	    if(data[key]){
	        switch(key){
	            case "freq":
	                validated = allowed(data.freq).allowed;
	                cause = "Forbidden Frequency "+data.freq+"MHz";
	                break;
	            case "tx":
	                validated = inrange(data.tx,4,20);
	                cause = "Sending Power";
	                break;
	            case "sf":
	                validated = inrange(data.sf,7,12);
	                cause = "Spreading Factor";
	                break;
	            case "friendly":
	                validated = true;
	                break;
	            case "iv":
	                minInterval = timeOnAir * allowed(data.freq).factor;
	                node.warn(minInterval)
	                validated = inrange(data.iv,minInterval,Infinity);
	                cause = `Send Interval is at least ${minInterval} ms !`;
	                break;
	        }
	        if(!validated) break;
	    }else{
	        validated = true;
	        continue;
	    }
	}
	
	msg.topic = validated;
	msg.cause = cause;
	
	return msg;
}


//id:e2a7d40.bca1a3
function Show_Notification(msg){
	if(msg.payload.nodes === undefined){
	    msg.payload = "No Device Selected";
	    msg.topic = "Configuration not valid!";
	    return msg;
	}
	
	if(msg.topic){
	    msg.payload = "Valid Configuration. Executed";
	    msg.topic = "Done.";
	}else{
	    msg.payload = "Choose other Params for "+msg.cause;
	    msg.topic = "Configuration not valid!"
	}
	return msg;
}


//id:f2230676.6a28f8
function Load_Devices(msg){
	nodes = global.get("LORIDANE.devices.gw");
	options = [];
	
	for (var node in nodes){
	    let name = "";
	    if(nodes[node].friendlyname != "" && nodes[node].friendlyname != undefined){
	        name = `${nodes[node].uid} - ${nodes[node].friendlyname}`;
	        options[node] = {[name]:nodes[node].uid};
	    }else{
	        name = `${nodes[node].uid}`;
	        options[node] = {[name]:nodes[node].uid} ;
	    }
	}
	return {options:options};
}


//id:eb1f6d8d.7bd5
function Join_Configurations(msg){
	nodes = msg.payload;
	if(msg.topic == "nodes"){
	    context.set("nodes",nodes);
	    return;
	}
	
	if(msg.topic == "data"){
	    nodes = context.get("nodes");
	    data = msg.payload;
	    data.freq /= 10;
	    data.sf /= 1; 
	    data.tx /= 1;
	}
	msg.payload = {nodes:nodes,data:data};
	return msg;
}


//id:59a2d840.f900a8
function Validate_Data(msg){
	data = msg.payload.data;
	let topic = true;
	inrange = global.get("LORIDANE.funcs.inRangeOf");
	
	
	function allowed(freq){
	    allowedfreq = global.get("LORIDANE.values.allowedFreq");
	    for (i = 0;i < allowedfreq.length -3;){
	        if (inrange(data.freq,allowedfreq[i],allowedfreq[i+1]) && (data.freq*10) % 2 === 0){
	            return true;
	        }
	        i += 3;
	    }
	    return false;
	}
	
	validated = false;
	keys = Object.keys(data);
	cause = "";
	
	for(var key of keys){
	    validated = false;
	    if(data[key]){
	        switch(key){
	            case "freq":
	                validated = allowed(data.freq);
	                cause = "Frequency";
	                break;
	            case "tx":
	                validated = inrange(data.tx,4,20);
	                cause = "Sending Power";
	                break;
	            case "sf":
	                validated = inrange(data.sf,7,12);
	                cause = "Spreading Factor";
	                break;
	            case "friendly":
	                validated = true;
	                break;
	        }
	        if(!validated) break;
	    }else{
	        validated = true;
	        continue;
	    }
	}
	
	msg.topic = validated;
	msg.cause = cause;
	
	return msg;
}


//id:3a7408c4.bf13f8
function Show_Notification(msg){
	if(msg.payload.nodes === undefined){
	    msg.payload = "No Device Selected";
	    msg.topic = "Configuration not valid!";
	    return msg;
	}
	
	if(msg.topic){
	    msg.payload = "Valid Configuration. Executed";
	    msg.topic = "Done.";
	}else{
	    msg.payload = "Choose other Params for "+msg.cause;
	    msg.topic = "Configuration not valid!"
	}
	return msg;
}


//id:c95a63e2.3f422
function Load_Devices(msg){
	nodes = global.get("LORIDANE.devices.nodes");
	gateways = global.get("LORIDANE.devices.gw");
	
	options = [];
	
	for (var node in nodes){
	    options.push(nodes[node].uid);
	}
	for (var gw in gateways){
	    options.push(gateways[gw].uid);
	}
	topic = "nodes";
	return {topic: topic, options:options};
}


//id:6146c722.a38c28
function Join_Configurations(msg){
	nodes = msg.options;
	let data;
	
	if(msg.topic == "nodes"){
	    context.set("nodes",nodes);
	    return;
	}
	
	if(msg.topic == "data"){
	    nodes = context.get("nodes");
	    data = msg.payload;
	    data.freq /= 10;
	    data.sf /= 1; 
	    data.tx /= 1;
	    data.iv *= 1000;
	}
	
	msg.payload = {nodes:nodes,data:data};
	return msg;
}


//id:215e0ff.224dbf
function Validate_Data(msg){
	data = msg.payload.data;
	let topic = true;
	inrange = global.get("LORIDANE.funcs.inRangeOf");
	const timeOnAir = global.get("LORIDANE.values.lastPayloadLens.toa");
	//node.warn(msg) //debug
	function allowed(freq){
	    allowedfreq = global.get("LORIDANE.values.allowedFreq");
	    for (i = 0;i < allowedfreq.length;i++){
	        if (inrange(data.freq,allowedfreq[i].min,allowedfreq[i].max)){
	            return {allowed:true, factor:allowedfreq[i].factor};
	        }
	    }
	    return false;
	}
	
	validated = false;
	keys = Object.keys(data);
	cause = "";
	
	for(var key of keys){
	    validated = false;
	    if(data[key]){
	        switch(key){
	            case "freq":
	                validated = allowed(data.freq).allowed;
	                cause = "Forbidden Frequency "+data.freq+"MHz";
	                break;
	            case "tx":
	                validated = inrange(data.tx,4,20);
	                cause = "Sending Power";
	                break;
	            case "sf":
	                validated = inrange(data.sf,7,12);
	                cause = "Spreading Factor";
	                break;
	            case "friendly":
	                validated = true;
	                break;
	            case "iv":
	                minInterval = timeOnAir * allowed(data.freq).factor;
	                validated = inrange(data.iv,minInterval,Infinity);
	                cause = `Send Interval which is at least ${minInterval} ms!`;
	                break;
	        }
	        if(!validated) break;
	    }else{
	        validated = true;
	        continue;
	    }
	}
	
	msg.topic = validated;
	msg.cause = cause;
	
	return msg;
}


//id:ff5a7863.d84e28
function Show_Notification(msg){
	if(msg.topic){
	    msg.payload = "Valid Configuration. Executed";
	    msg.topic = "Done.";
	}else{
	    msg.payload = "Choose other Params for "+msg.cause;
	    msg.topic = "Configuration not valid!"
	}
	return msg;
}


//id:13ae9bb0.19ccf4
function Send_configuration_to_nodes(msg){
	if(!msg.topic){
	    return;
	}
	data = msg.payload.data;
	nstream = "cn:";
	
	gateways = [];
	nodes = msg.payload.nodes;
	for(i=nodes.length-1;i>=0;i--){
	    if(nodes[i].startsWith("GW")){
	        gateways.push(nodes[i]);
	    }else{
	        break;
	    }
	}
	
	keys = Object.keys(data);
	for(var key of keys){
	    if(data[key] === 0){
	        continue;
	    }
	    switch(key){
	        case "freq":
	            freq = data.freq;
	            freq*=10;
	            nstream += "fn:"+freq+";";
	            break;
	        case "tx":
	            nstream += "tn:"+data.tx+";";
	            break;
	        case "iv":
	            nstream += "iv:"+data.iv+";";
	            break;
	        case "sf":
	            nstream += "sn:"+data.sf+";";
	    }
	}
	let gstream = nstream.replace("cn","cg").replace("fn","fg").replace("sn","sg");
	
	for (var gw of gateways){
	    topic = "lora/"+gw;
	    node.send({payload:nstream,topic:topic});
	    node.send({payload:gstream,topic:topic});
	}
	return;
}


//id:60d33b08.42a134
function show_current_settings(msg){
	settings = global.get("LORIDANE.devices.gw[0]");
	freq = settings.freq / 1e6;
	sf = settings.sf;
	msg.payload = "Frequency: "+freq+" MHz , SF: "+sf;
	return msg;
}


//id:1733b022.f7d1a
function Send_configuration_to_nodes(msg){
	if(!msg.topic){
	    return;
	}
	data = msg.payload.data;
	stream = "cg:";
	
	gateways = [];
	nodes = msg.payload.nodes;
	for(i=nodes.length-1;i>=0;i--){
	    if(nodes[i].startsWith("GW")){
	        gateways.push(nodes[i]);
	    }else{
	        break;
	    }
	}
	
	keys = Object.keys(data);
	for(var key of keys){
	    if(data[key] === 0){
	        continue;
	    }
	    switch(key){
	        case "freq":
	            freq = data.freq;
	            freq*=10;
	            stream += "fg:"+freq+";";
	            break;
	        case "tx":
	            stream += "tg:"+data.tx+";";
	            break;
	        case "sf":
	            stream += "sg:"+data.sf+";";
	    }
	}
	
	for (var gw of gateways){
	    topic = "lora/"+gw;
	    if (stream != "cg:"){
	    node.send({payload:stream,topic:topic});
	    }
	}
	
	if (data.friendly != ""){
	    node.send({friendlyname:{name:data.friendly,uid:nodes[0]}});
	}
	
	return;
}


//id:53654a49.b88fe4
function Send_configuration_to_nodes(msg){
	if(!msg.topic){
	    return;
	}
	data = msg.payload.data;
	stream = "";
	
	gateways = [];
	nodes = msg.payload.nodes;
	nodesHDD = global.get("LORIDANE.devices.nodes");
	
	for(i=0;i <= nodes.length-1;i++){
	    for(j=0;i <= nodesHDD.length-1;j++)
	    if(nodes[i]==nodesHDD[j].uid){
	        gateways.push(nodesHDD[j].nextGW);
	        break;
	    }
	}
	
	keys = Object.keys(data);
	for(var key of keys){
	    if(data[key] === 0){
	        continue;
	    }
	    switch(key){
	        case "freq":
	            freq = data.freq;
	            freq*=10;
	            stream += "fn:"+freq+";";
	            break;
	        case "tx":
	            stream += "tn:"+data.tx+";";
	            break;
	        case "sf":
	            stream += "sn:"+data.sf+";";
	            break;
	        case "iv":
	            stream += "iv:"+data.iv+";"
	    }
	}
	
	for (var gw of gateways){
	    topic = "lora/"+gw;
	    
	    for(var nd in nodes){
	        if(stream != "cn:"){
	        node.send({payload:nodes[nd]+stream,topic:topic});
	        }
	    }
	    
	}
	
	if (data.friendly != ""){
	    node.send({friendlyname:{name:data.friendly,uid:nodes[0]}});
	}
	
	
	return;
}


//id:9e3d1b59.23c838
function neglect_msg_friendlyname(msg){
	if(msg.friendlyname !== undefined){
	    return;
	}
	return msg;
}


//id:468f1d28.df4054
function show_current_settings(msg){
	gws = msg.payload;
	settings = global.get("LORIDANE.devices.gw");
	let freq;
	let friendly;
	let sf;
	let arr = [];
	
	
	for (var gw in gws){
	    for(var s in settings){
	        if(gws[gw] == settings[s].uid){
	            (settings[s].friendlyname === undefined || settings[s].friendlyname == "") ? friendly = settings[s].uid : friendly = settings[s].friendlyname;
	            freq = settings[s].freq / 1e6;
	            sf = settings[s].sf;
	            arr.push("GW: "+friendly+" , Frequency: "+freq+" MHz , SF: "+sf);
	        }
	    }
	}
	
	freq = settings.freq / 1e6;
	sf = settings.sf;
	msg.payload = arr.join("; ");
	
	if(msg.payload.length > 0){
	    msg.title = "Current Settings";
	}else{
	    msg.title = "";
	}
	
	return msg;
}


//id:2581615a.b8042e
function (msg){
	setTimeout(()=>node.send({topic:"",payload:""}),15000);
	return msg;
}


//id:1fbeb059.389d9
function show_current_settings(msg){
	gws = msg.payload;
	settings = global.get("LORIDANE.devices.nodes");
	let freq;
	let friendly;
	let sf;
	let arr = [];
	
	
	for (var gw in gws){
	    for(var s in settings){
	        if(gws[gw] == settings[s].uid){
	            (settings[s].friendlyname === undefined || settings[s].friendlyname == "") ? friendly = settings[s].uid : friendly = settings[s].friendlyname;
	            freq = settings[s].freq / 1e6;
	            sf = settings[s].sf;
	            arr.push("Node: "+friendly+" , Frequency: "+freq+" MHz , SF: "+sf);
	        }
	    }
	}
	
	freq = settings.freq / 1e6;
	sf = settings.sf;
	msg.payload = arr.join("; ");
	
	if(msg.payload.length > 0){
	    msg.title = "Current Settings";
	}else{
	    msg.title = "";
	}
	
	return msg;
}


//id:e07d7f1f.6ba2e
function Load_Devices(msg){
	let nodes = global.get("LORIDANE.devices.nodes");
	let gws = global.get("LORIDANE.devices.gw");
	let options = [];
	
	// as list for the choose device dropdown load the device an if available the friendlyname
	for (var node in nodes){
	    let name = "";
	    if(nodes[node].friendlyname != "" && nodes[node].friendlyname != undefined){
	        name = `${nodes[node].uid} - ${nodes[node].friendlyname}`;
	        options[node] = {[name]:nodes[node].uid};
	    }else{
	        name = `${nodes[node].uid}`;
	        options[node] = {[name]:nodes[node].uid} ;
	    }
	}
	for (var gw in gws){
	    let name = "";
	    if(gws[gw].friendlyname != "" && gws[gw].friendlyname != undefined){
	        name = `${gws[gw].uid} - ${gws[gw].friendlyname}`;
	        options.push({[name]:gws[gw].uid});
	    }else{
	        name = `${gws[gw].uid}`;
	        options.push({[name]:gws[gw].uid}) ;
	    }
	}
	
	return {options:options};
}


//id:6bdca1f.8f1186
function delete_devices(msg){
	if(msg.payload != "OK")return;
	
	//else
	deleteDevice = global.get("LORIDANE.funcs.deleteDevice");
	writeConfig = global.get("LORIDANE.funcs.writeConfig");
	
	devices = msg.devices;
	
	for(var device of devices){
	    deleteDevice(device);
	}
	
	writeConfig();
	
	return;
}


//id:1b40754c.f5998b
function throttle(msg){
	setTimeout((msg)=>node.send(msg),200,msg);
	return;
}


//id:f8f1978f.438928
function generate_and_show_mac(msg){
	const funcs = global.get("LORIDANE.funcs");
	const gws = funcs.getUIDGW;
	const nds = funcs.getUIDND;
	let knownDevices = gws().concat(nds());
	
	for (let i in knownDevices){
	    knownDevices[i] = knownDevices[i].substring(2);    
	}
	
	//node.warn(knownDevices);
	
	function generateMAC(){ //tests if generated MAC is already in use
	    const cr = global.get("crypto");
	    var token = cr.randomBytes(6).toString('hex').toUpperCase();
	    if(knownDevices.indexOf(token) == -1){
	        msg.payload = token;
	        msg.topic = "This is a new random MAC address token. Prefix 'GW' or 'NO' to generate a new Device ID."
	        return msg;
	    }else{
	        generateMAC();
	    }
	}
	
	generateMAC();
	
	return msg;
}


//id:8e968c3c.eb59d
function delete_tokens(msg){
	if(msg.payload == "Yes, sure"){
	    global.set("LORIDANE.API.token",[]);
	}
	return;
}


//id:f624fc7e.eebc2
function (msg){
	msg.payload = "If yes, you will have to generate new ones and change them on every application";
	msg.topic = "Delete all known Tokens?";
	return msg;
}


//id:22ce213d.bd49be
function Load_Devices(msg){
	options = global.get("LORIDANE.ignorelist") || [];
	
	return {options:options};
}


//id:8a7fbb8d.eb5f48
function move_device_from_ignore_to_admit(msg){
	if(msg.payload != "OK" || msg.devices == [])return;
	
	//else
	const writeConfig = global.get("LORIDANE.funcs.writeConfig");
	let admit = global.get("LORIDANE.admit")
	let devices = msg.devices;
	
	for(var device of devices){
	    admit.push(device);
	}
	global.set("LORIDANE.admit",admit);
	
	writeConfig();
	
	return;
}


//id:62e26b8b.b40d54
function write_config(msg){
	writeConfig = global.get("LORIDANE.funcs.writeConfig");
	writeConfig(0 /**delay in ms*/);
	return;
}


//id:db7480dc.a712b
function write_config(msg){
	WC = global.get("LORIDANE.funcs.writeConfig");
	WC(100)
	return;
}


//id:a0be56ff.ac9d48
function (msg){
	const USER = msg.user;
	msg.payload = `/home/${USER}/LORIDANE/config/`;
	return msg;
}


//id:dbefc9ac.db1378
function Watch_Config_Folder(msg){
	//Import filesystem Lib
	const fs = global.get("fs");
	const homepath = msg.payload;
	let LORIDANE = {};
	let memCache = {};
	LORIDANE.LinuxUsername = msg.user;
	node.status({text:"Reading Config File and load to Memcache"})
	
	//Look for the config file
	let path = homepath+"loridaneConfig.json";
	let config = JSON.parse(fs.readFileSync(path)); //load config
	delete config._comment;
	LORIDANE.settings = config;
	
	//change path to the path of the memcache file
	path = LORIDANE.settings.path.config+"memCacheLoridane.json";
	
	if(fs.existsSync(path)){
	    try{
	        memCache = JSON.parse(fs.readFileSync(path));
	    }catch (e){
	        node.warn(e);
	    }
	}
	//check if memCache exists and concat objects
	if(memCache) LORIDANE = {...LORIDANE,...memCache};
	LORIDANE.blockONstart = false;
	
	// save to memcache    
	global.set("LORIDANE",LORIDANE);
	setTimeout(()=>node.status({text:"Initialized"}),3000);
	return msg;
}


//id:faf4204b.7f915
function Extract_Username(msg){
	data = msg.payload;
	
	// grep the name of the /home directory from <cat /etc/passwd | grep home>
	startindex = data.indexOf("/home/") + 6;
	user = data.substring(startindex,data.indexOf(":",startindex));
	global.set(["LORIDANE.LinuxUsername","LORIDANE.blockONstart"],[user,true]);
	node.status({text:"Linux Username: "+user});
	msg.user = user;
	return msg;
}


//id:793fd.aa091c034
function Classes(msg){
	classes = {
	    newConfig:
	        class newConfig{ // class initiator for device configs
	            constructor(UID,type,freq,sf,friendlyname,interval,nextgw){
	                this.uid = UID;
	                this.type = type;
	                this.freq = freq;
	                this.sf = sf;
	                this.friendlyname = friendlyname;
	                this.interval = interval;
	                this.nextGW = nextgw;
	            }
	        },
	
	};
	global.set("LORIDANE.classes",classes);
	return msg;
}


//id:15da05df.3dbc1a
function Functions(msg){
	funcs = {
	    checkUID: //**validate the device ID*/
	        function checkUID(UID){ //#bool
	            if(UID.length !== 14){
	                return false;
	            }
	            
	            if(!UID.startsWith("NO")&& !UID.startsWith("GW")){
	                return false;
	            }
	            for (index=2;index<UID.length;index++){
	                fit = new RegExp(/([A-F0-9])/).test(UID[index]);
	                if(!fit){
	                return fit;
	                }
	            }
	            return fit;
	        },
	    inRangeOf: //**check if num value is in a range*/
	        function inRangeOf(value,lower,upper){ //#bool
	            if (value >= lower && value <= upper){
	                return true;
	            }
	            return false;
	        },
	    getUIDGW: //**get all Gateway UIDs*/
	        function getUIDGW(){ //#array of strings
	            devices = global.get("LORIDANE.devices.gw");
	            let arr = [];
	            for (var d in devices){
	                arr.push(devices[d].uid);
	            }
	            return arr;
	        },
	    getUIDND: //**get all Node UIDs*/
	        function getUIDND(){ //#array of strings
	            devices = global.get("LORIDANE.devices.nodes");
	            let arr = [];
	            for (var d in devices){
	                arr.push(devices[d].uid);
	            }
	            return arr;
	        },
	    findGW://**find the index of a particular Gateway*/
	        function findGW(UID){ //#integer
	            const devices = global.get("LORIDANE.devices.gw");
	            let i;
	            if(UID.startsWith("GW")){
	                for(i in devices){
	                    if(devices[i].uid == UID)return i;
	                }
	            }
	            return -1;
	        },
	    findNode://**find the index of a particular Node*/
	        function findNode(UID){ //#integer
	            const devices = global.get("LORIDANE.devices.nodes");
	            let i;
	            if(UID.startsWith("NO")){
	                for(i in devices){
	                    if(devices[i].uid == UID)return i;
	                }
	            }
	            return -1;
	        },
	    deleteDevice: //**delete a particular device from memcache*/
	        function deleteDevice(UID){ //#none
	            var devices = global.get("LORIDANE.devices");
	            var nodes = devices.nodes;
	            var gws = devices.gw;
	            let index;
	            index = funcs.findGW(UID);
	            if(index >= 0){
	                gws.splice(index,1);
	                global.set("LORIDANE.devices.gw",gws);
	            }
	            index = funcs.findNode(UID);
	            if(index >= 0){
	                nodes.splice(index,1);
	                global.set("LORIDANE.devices.nodes",nodes);
	            }
	            return;
	        },
	        writeConfig://*write the memcache to the memcache file**/
	            function writeConfig(delaytime){ // milliseconds #bool
	            let executed = true;
	                function writeDelayed(){
	                    const fs = global.get("fs");
	                    var loridane =  global.get("LORIDANE");
	                    const configpath = loridane.settings.path.config;
	                    delete loridane.homepath;
	                    const loridaneString = JSON.stringify(loridane,null,2);
	                    //fs.writeFileSync(configpath+"memCacheLoridane.json",loridaneString)
	                    fs.writeFile(configpath+"memCacheLoridane.json",loridaneString, err => {
	                        if (err) {
	                            console.error(err)
	                            return
	                        }
	                        //file written successfully
	                        })
	
	                        return true;
	                }
	                if(delaytime === 0 || delaytime === undefined){
	                    executed = writeDelayed();
	                }else{
	                    setTimeout(writeDelayed,delaytime);
	                }
	            return executed;
	        },
	        getConfig: //**get the whole configuration object by uid*/
	            function getConfig(uid){ //#object
	                let devices;
	                let device;
	                indexgw = funcs.findGW(uid);
	                indexno = funcs.findNode(uid);
	                
	                if(indexgw != -1){
	                    devices = global.get("LORIDANE.devices.gw")
	                    device = devices[indexgw]
	                }else if(indexno != -1){
	                    devices = global.get("LORIDANE.devices.nodes")
	                    device = devices[indexno]
	                }
	                return device;
	            },
	        decrypt:
	            function decrypt(payload){ /*String*/
	            //node.warn(payload)
	                // Only decrypt when payload is ciphered
	                const cr = global.get("crjs");
	                const crypt = global.get("LORIDANE.settings.encryption");
	                const key = cr.enc.Utf8.parse(crypt.key);
	                //value = cr.enc.Hex.parse(asciiToHex(payload));
	                let buf = Buffer.from(payload, 'ascii').toString();
	                node.warn(buf)
	                
	                let bytes  = cr.AES.decrypt(buf, key, {
	                    mode: cr.mode.ECB,
	                    padding: cr.pad.NoPadding
	                });
	                //node.warn(bytes)
	                //let plaintext = cr.enc.Ascii.stringify(bytes);
	                //let decoded = bytes.toString(cr.enc.Ascii);//hex2a(plaintext);
	                let decrypted = bytes.toString(cr.enc.Ascii);
	                //let words = cr.enc.Hex.parse(decrypted)
	                //let decoded = words.toString(cr.enc.Hex)
	                decoded = funcs.hex2a(decrypted)
	                
	                node.warn(decoded)
	                
	                return decoded;
	            },
	            hex2a:
	            function hex2a(hexx) {
	                    var hex = hexx.toString();//force conversion
	                    var str = '';
	                    for (var i = 0; i < hex.length; i += 2){
	                        str += String.fromCharCode(parseInt(hex.substr(i, 2), 16));
	                    }
	                    return str;
	                    },
	        timeOnAir:
	            function timeOnAir(bytes,sf){
	                let toa = Math.ceil((8 + ((bytes*8 - 4 * sf + 28) / (4 * sf) * 5)) * (2 ** sf) / (1e2));
	                return toa;
	            },
	            math:{//**matematical functions*/
	                getMean://**mean of an array*/
	                    function getMean(arr){ //#double
	                        mean = arr.reduce((a,b) => a+b)/arr.length;
	                        return mean;
	                    },
	                getSmooth://**running mean of an array by smooting interval*/
	                    function getSmooth(arr,interval){ //#array
	                        smoothened = [];
	                        getMean = funcs.math.getMean;
	                        const arrcpy = arr;
	                        intHalf = Math.floor(interval/2);
	                        for(i=0;i<intHalf;i++){
	                            smoothened.push(arr[i]);
	                        }
	                        for(i = intHalf; i < arr.length - intHalf; i++){
	                            smoothened.push(getMean(arrcpy.slice(i-intHalf,i+interval)));
	                        }
	                        for(i=arr.length - intHalf;i<arr.length;i++){
	                            smoothened.push(arr[i]);
	                        }
	                        return smoothened;
	                    },
	                getCDS://**array with the numeric first or second derivative*/
	                    function getCDS(arr,order){ // # array
	                        let CDS = [0];
	                        const len = arr.length;
	                        switch(order){
	                            case 1:
	                                for(i=1;i<len-1;i++){
	                                    CDS.push((arr[i+1]-arr[i-1])/2);
	                                }
	                                break;
	                            case 2:
	                                for(i=1;i<len-1;i++){
	                                    CDS.push((arr[i+1] -2*arr[i]+arr[i-1]));
	                                }
	                                break;
	                        }
	                        CDS.push(0);
	                        return CDS;
	                    }
	                }
	};
	global.set("LORIDANE.funcs",funcs);
	return;
}


//id:a361ed6d.d5815
function Values(msg){
	values = {
	    allowedFreq:
	        [
	            {min:863,max:864.875,factor:1000},
	            {min:865,max:868.475,factor:100},
	            {min:868.7,max:869.025,factor:1000},
	            {min:869.4,max:869.525,factor:1000},
	            {min:869.7,max:869.875,factor:100}
	        ],
	        freq:{}
	};
	values.freq.min = 863;
	values.freq.max = 869.875;
	
	global.set("LORIDANE.values",values);
	return msg;
}


//id:d435f79f.f30138
function set_blockonstart_false(msg){
	setTimeout(()=>global.set("LORIDANE.blockONstart",false),5000)
	return;
}


//id:e4d7b82.7ce1f48
function Wait_5s(msg){
	lastmsg = context.get("lastmsg")||Date.now();
	now = Date.now();
	context.set("lastmsg",now);
	timer = context.get("timer");
	clearTimeout(timer);
	context.set("timer",timer);
	
	function send(msg){
	    node.send(msg);
	}
	
	if(msg.topic == "subito"){
	    send(msg);
	}else{
	    timer = setTimeout(send,5000,msg);
	    context.set("timer",timer);
	}
	
	return;
}


//id:94811c76.73936
function LORIDANE_-_TIMEDISK(msg){
	const devices = global.get("LORIDANE.devices");
	var devicecount = devices.gw.length + devices.nodes.length;
	sf = devices.gw[0].sf;
	
	//timedisksize = Math.ceil((50 * 8 * Math.pow(2, sf))/(sf * 100000) * devicecount * 1000);
	
	timedisksize = Math.ceil(((8 + ((400 - 4*sf + 28)/(4*sf)*5)) * Math.pow(2,sf)/(1e5)*1000)*devicecount);
	
	msg.payload = {size:timedisksize,devicecount:devicecount};
	global.set(["LORIDANE.timedisk.size","LORIDANE.timedisk.count"],[timedisksize,devicecount]);
	return msg;
}


//id:6dc379ee.b0e338
function send_new_Timedisk(msg){
	let nodes = global.get("LORIDANE.devices.nodes");
	const gws = global.get("LORIDANE.devices.gw");
	nodes = nodes.concat(gws); 
	lastnodes = context.get("lastnodes")||[];
	context.set("lastnodes",nodes);
	tdsize = msg.payload.size;
	let newtd = false;
	subito = (msg.topic == "subito");
	//node.warn(subito) //debugging
	let disk = {}; //global.get("LORIDANE.timedisk.disk")||{};
	
	let additionalDelay;
	(tdsize -10 < 1e5) ? additionalDelay = 50: additionalDelay = tdsize -10;
	
	setTimeout(()=>node.status({}),5000);
	
	function senddelayed(obj){
	    node.send(obj);
	}
	
	if(lastnodes.length === 0){
	    for(i=0 , all = nodes.length; i < all ; i++){
	        if(nodes[i].uid != lastnodes[i].uid){
	            newtd = true;
	            break;
	        }
	    }
	}
	
	find = global.get("LORIDANE.funcs.findNode");
	getconf = global.get("LORIDANE.funcs.getConfig");
	
	count = 0;
	newtd = true;
	if (newtd && !subito){
	    time = 0;
	    sentUID = {};
	    for (var gw in gws){
	        for (i=0;i<nodes.length;i++){
	            obj = {payload:`${nodes[i].uid}td:${count};${tdsize};`,topic:`lora/${gws[gw].uid}`};
	            if(sentUID[`${nodes[i].uid}`] === undefined){
	                setTimeout(senddelayed,time,obj);
	                time += additionalDelay;
	                disk[nodes[i].uid] = {uid:nodes[i].uid,slot:count,tdsize:tdsize};
	                sentUID[`${nodes[i].uid}`] = {};
	                sentUID[`${nodes[i].uid.count}`] = count;
	                count++;
	            }
	        }
	        obj = {payload:`cn:sync`,topic:`lora/${gws[gw].uid}`};
	        setTimeout(senddelayed,time,obj);
	    }
	    node.status({text: "Sent new Timedisk"});
	}
	global.set("LORIDANE.timedisk.disk",disk);
	
	if(subito){
	    devs = global.get("LORIDANE.classA");
	    getconf = global.get("LORIDANE.funcs.getConfig");
	    for (var dev of devs){
	        if(disk[dev] !== undefined){
	            //node.warn(disk)
	            obj = {payload:`${dev}td:${disk[dev].slot};${disk[dev].tdsize};`,topic:`lora/${getconf(dev).nextGW}`};
	            senddelayed(obj);
	        }
	    }
	}
	
	return;
}


//id:1a746dcd.d51fd2
function Acknowledge(msg){
	data = msg.data;
	//const devs = global.get("LORIDANE.devices");
	
	// if Lora msg payload is Node UID its an ackn
	if (msg.data.pay == msg.config.node){
	    msg.topic = "acknowledge";
	    node.status({text:"New Device found"});
	    
	}
	node.status({});
	return msg;
}


//id:6a479509.a7889c
function Process_incoming_Data(msg){
	raw = msg.payload;
	if(raw === "pong")return;
	let lastmsgs = context.get("lastmsgs")||[];
	const now  = Date.now();
	
	//node.warn(raw)
	function extractID(pay){
	    let len = 14;
	    this.node = pay.slice(0,len);
	    this.pay = pay.slice(len,pay.length);
	    return this;
	}
	
	function extractDecipher(raw){
	    let message = raw.split('');
	    const payIndex = raw.indexOf('payload') +10;
	    const endIndex = raw.indexOf('gw') -3;
	    let cipherpay = message.splice(payIndex, endIndex - payIndex);
	    const decrypt = global.get("LORIDANE.funcs.decrypt");
	    let clearpay = decrypt(cipherpay.join(''));
	    //node.warn(clearpay)
	    clearpay = clearpay.split('');
	    message.splice(payIndex, 0, clearpay);
	    //node.warn(message.join(''))
	    return message.join('');
	}
	let input;
	//*/Variant 1 raw json
	if(raw.startsWith("{")){
	    //*/Variant 1 object
	    if(raw.includes('"payload":"NO')){
	        try{
	            input = JSON.parse(raw);
	        }catch(e){
	            node.warn('There is something Wrong with the JSON (Line 37)')
	        }
	    }else{
	        message = extractDecipher(raw);
	        //node.warn(message)
	        try{
	            input = JSON.parse(message);
	        }catch(e){
	            node.warn(`There is something Wrong with the JSON (Line 44) ERR: ${e}`)
	        }
	        
	    }
	    nodedata = input.payload;
	    gateway = input.gw;
	    RSSI = input.rssi;
	    SNR = input.snr;
	    SF = input.sf;
	    freq = input.freq;
	    (isNaN(extractID(nodedata).pay))? payload =  extractID(nodedata).pay : payload = parseFloat(extractID(nodedata).pay);
	    node = extractID(nodedata).node;
	}else{
	    // Extract the data from the LoRa msg if ;-split string
	    input  = msg.payload.split(";");
	    nodedata = input[0];
	    if(!nodedata.startsWith("NO")){
	        const decrypt = global.get("LORIDANE.funcs.decrypt");
	        nodedata = decrypt(nodedata);
	    }
	    gateway = extractID(input[1]).node;
	    RSSI = parseInt(input[2]);
	    SNR = parseFloat(input[3]);
	    SF = parseInt(input[4]);
	    freq = parseInt(input[5]);
	    payload = extractID(nodedata).pay;
	    node = extractID(nodedata).node;
	}
	
	ignorelist = global.get("LORIDANE.ignorelist")||[];
	ignore = (ignorelist.indexOf(node) != -1 && ignorelist.indexOf(gateway) != -1);
	
	if(ignore)return;
	
	// object that takes all data from the msg
	msg.data = {
	    pay: payload,
	    gw: gateway,
	    node: node,
	    freq: freq,
	    sf: SF,
	    rssi: RSSI,
	    snr: SNR,
	    lastSeen: now,
	};
	    
	//object that will be passed through the core nodes
	msg.config = {
	    gw: gateway,
	    node: node,
	    freq: freq,
	    sf: SF,
	    lastSeen: now,
	};
	msg.raw = raw; // the raw LoRa msg
	msg.payload = payload; // the actual payload
	let paylens = global.get("LORIDANE.values.lastPayloadLens")||{historic:[],mean:50,toa:83};
	const getMean = global.get("LORIDANE.funcs.math.getMean");
	const timeOnAir = global.get("LORIDANE.funcs.timeOnAir");
	
	paylens.historic.unshift(payload.length);
	if(paylens.historic.length >= 20){
	    paylens.historic.pop();
	}
	paylens.mean = getMean(paylens.historic);
	paylens.toa = timeOnAir(paylens.mean,SF);
	global.set("LORIDANE.values.lastPayloadLens", paylens);
	
	return msg;
}


//id:f023d975.deb8d8
function msg_data_pay_to_msg_payload(msg){
	let payload = msg.data.pay;
	const checkUID = global.get("LORIDANE.funcs.checkUID");
	
	if(payload == "+")return;
	if(!checkUID(msg.data.node))return;
	
	topic = msg.topic;
	
	//cut the data object to the minimum
	msg = {payload:payload, topic:topic, data:msg.data, config:msg.config};
	return msg;
}


//id:ace12ad7.be1258
function Confirmation_of_configuration_messages_via__+__payload(msg){
	if(msg.data.pay != "+")return;
	
	function getNextGW(uid){
	    nodes = global.get("LORIDANE.devices.nodes");
	    for (var device in nodes){
	        if (nodes[device].uid === uid){
	            return nodes[device].nextGW;
	        }
	        return undefined;
	    }
	}
	
	let confirm = global.get("LORIDANE.confirm");
	now = Date.now();
	from = msg.data.node;
	size = global.get("LORIDANE.timedisk.size");
	
	for(i=0;i<confirm.length;){
	    if(from == confirm[i].uid && msg.data.pay == "+") {
	        confirm.splice(i,1);
	        global.set("LORIDANE.confirm",confirm);
	    }else if(now - confirm[i].time >= 5*size){
	        msg = {payload: confirm[i].out, topic:"lora/"+getNextGW(from)};
	        confirm.splice(i,1);
	        global.set("LORIDANE.confirm",confirm);
	        node.send(msg);
	    }else if(now - confirm[i].time >= 10*size){
	        confirm.splice(i,1);
	        global.set("LORIDANE.confirm",confirm);
	    }else{
	        i++;
	    }
	}
	global.set("LORIDANE.confirm",confirm);
	
	return;
}


//id:e8e230ba.be0de
function decrypt(msg){
	if(global.get("LORIDANE.settings.encryption.engaged") !== true) return msg;
	
	// Only decrypt when payload is ciphered
	const cr = global.get("crjs")
	const crypt = global.get("LORIDANE.settings.encryption")
	const iv = crypt.iv
	const key = crypt.key
	
	var bytes  = cr.AES.decrypt( msg.data.pay, key, {
	  iv: iv,
	  mode: cr.mode.CBC,
	  padding: cr.pad.ZeroPadding
	});
	
	var plaintext = bytes.toString(cr.enc.Utf8); //Base64
	msg.data.pay = plaintext;
	return msg;
}


//id:1c0ac556.46e25b
function filter_msg_from_multiple_gw(msg){
	lastmsgs = context.get("lastmsgs")||[];
	const newmsg = msg;
	let timer = context.get("timer");
	clearTimeout(timer);
	context.set("timer",timer);
	let newmsgbool;
	
	function send(lastmsgs){
	    for(var msg of lastmsgs){
	        node.send(msg)
	    }
	    context.set("lastmsgs",[]);
	}
	
	now = Date.now();
	if(lastmsgs != []){
	    newmsgbool = true;
	    for (ms=0;ms<lastmsgs.length;/**only increment in else*/){
	        if(now - lastmsgs[ms].data.lastSeen >= 100){
	            lastmsgs.splice(ms,1);
	        }else{
	            ms++;
	        }
	    }
	
	    for (ms=0;ms<lastmsgs.length;/**only increment in else*/){
	        if(newmsg.data.pay == lastmsgs[ms].data.pay && newmsg.data.node == lastmsgs[ms].data.node){
	            newmsgbool = false;
	            if(newmsg.data.rssi > lastmsgs[ms].data.rssi && now - lastmsgs[ms].data.lastSeen <= 100){
	                lastmsgs[ms] = newmsg;
	                break;
	            }
	        }
	        ms++;
	    }
	}
	
	if(newmsgbool)lastmsgs.push(newmsg);
	context.set("lastmsgs",lastmsgs);
	timer = setTimeout(send,100,lastmsgs);
	context.set("timer",timer);
	return;
}


//id:bb9d0db9.4979b
function admit(msg){
	node = msg.data.node;
	gw = msg.data.gw;
	payload = msg.payload;
	
	findGW = global.get("LORIDANE.funcs.findGW");
	findNode = global.get("LORIDANE.funcs.findNode");
	admit = global.get("LORIDANE.admit")||[];
	checkUID = global.get("LORIDANE.funcs.checkUID");
	
	
	indexgw = findGW(gw);
	indexnode = findNode(node);
	
	UIDvalid = (checkUID(node) && checkUID(gw));
	if((indexgw >= 0 && indexnode >= 0) || !UIDvalid )return;
	
	if(indexgw == -1){
	    admit.push(gw);
	}
	if(indexnode == -1){
	    if(payload == node){
	        admit.push(node);
	    }
	}
	
	global.set("LORIDANE.admit",admit);
	
	if(admit.length > 0){
	    msg.admit = admit;
	    return msg;
	}
	return;
}


//id:340c50f1.6dadc
function change_tab_to_ADMITTANCE(msg){
	if(msg.payload != "OK, Change Tab")return;
	msg.payload = {"tab":"Admittance"}
	return msg;
}


//id:3d42dae8.ad8c96
function change_tab_to_MSGS(msg){
	msg.payload = {"tab":"Messages"}
	return msg;
}


//id:c4a84594.067618
function (msg){
	return {options:msg.admit};
}


//id:45de5a13.5445f4
function save_admission(msg){
	let wantAdmittance = global.get("LORIDANE.admit");
	let admitted = msg.payload;
	const findGW = global.get("LORIDANE.funcs.findGW");
	const findNode = global.get("LORIDANE.funcs.findNode");
	const deleteDevice = global.get("LORIDANE.funcs.deleteDevice");
	const writeConfig = global.get("LORIDANE.funcs.writeConfig");
	let ignorelist = global.get("LORIDANE.ignorelist");
	
	for (var device of wantAdmittance){
	    if(admitted.indexOf(device) >= -1){
	        wantAdmittance.splice(wantAdmittance.indexOf(device),1);
	    }
	}
	
	
	for(device of wantAdmittance){
	    deleteDevice(device)
	    ignorelist.push(device)
	}
	global.set(["LORIDANE.admit","LORIDANE.ignorelist"],[[],ignorelist]);
	writeConfig();
	return;
}


//id:af3bda90.002258
function new_timedisk_when_acknowledge(msg){
	if(msg.payload != msg.data.node)return;
	return msg;
}


//id:10aa9bc2.dd3dd4
function reset_interval(msg){
	if (msg.data.pay != msg.data.node)return;
	
	function sendDelay(msg){
	    node.send(msg);
	}
	
	const find = global.get("LORIDANE.funcs.findNode");
	const getConfig = global.get("LORIDANE.funcs.getConfig");
	let UID = msg.data.node;
	const getGWs = global.get("LORIDANE.funcs.getUIDGW");
	
	let index = find(UID);
	if(index == -1)return;
	
	const interval = Math.floor(getConfig(UID).lastinterval / 1000) * 1000;
	
	if (interval < 5000)return;
	let gateways  = getGWs();
	
	msg.payload = UID+"iv:"+interval;
	for(var gw of gateways){
	    msg.topic = "lora/"+gw;
	    setTimeout(sendDelay,15000,msg);
	}
	
	return;
}


//id:b3b76bf0.aef8c8
function timedisk_to_classA(msg){
	classA = global.get("LORIDANE.classA")||[];
	if(classA.indexOf(msg.data.node) != -1){
	    msg.topic = "subito";
	    //node.warn("Subito!")
	    return msg;
	}
	return;
}


//id:d505a1dd.b771d
function Test_Downlink(msg){
	function checkdevices(arr,fun){
	    for (var j in array){
	        if (!fun(arr[j]) || !arr[j].startsWith("NO:")){
	            node.error(`The Device @Index ${j} "${arr[j]}" is no valid DeviceUID`);
	            return false;
	        }
	        return true;
	    }
	}
	
	let inData = msg.payload;
	
	if(typeof(inData) == "string"){
	    return msg;
	}
	
	let downdataNO = "";
	let downdataGW = "";
	let checkUID = global.get("funcs.checkUID");
	let deffreq = (msg.freq !== undefined);
	let defsf = (msg.sf !== undefined);
	let deftx =  (msg.tx !== undefined);
	let defdevice = (msg.device !== undefined);
	let prefix = "";
	
	if(!defdevice){
	    node.warn("Invalid msg.device");
	}
	if(!msg.topic.startsWith("lora/")){
	    node.warn("Invalid msg.topic");
	}
	
	if(msg.device.length == 1 && msg.device[0].length >= 1 && checkdevices(msg.device[0],checkUID)){
	   for (var i of msg.devices[0]){
	    node.send({payload: i+downDataNO,topic:msg.topic});
	   }
	}
	
	if(msg.device.includes("nodes")){
	    prefix += "cn:";
	    if (deffreq){
	        downdataNO += "fn:"+msg.freq+";";
	    }
	    if (defsf){
	        downdataNO += "sn:"+msg.sf+";";
	    }
	    if(deftx){
	        downdataNO += "tn:"+msg.tx+";";
	    }
	}
	
	if(msg.device.includes("gateways")){
	    prefix += "cg:";
	     if (deffreq){
	        downdataGW += "fg:"+msg.freq+";";
	    }
	    if (defsf){
	        downdataGW += "sg:"+msg.sf+";";
	    }
	    if(deftx){
	        downdataGW += "tg:"+msg.tx+";";
	    }
	}
	node.send({payload: prefix + downdataNO + downdataGW ,topic:msg.topic});
	return;
}


//id:1a95a2d5.655b3d
function Send_in_Timerframe(msg){
	function sendmsg(msg){
	    node.send(msg)
	}
	
	function getSendTime(UID){
	    const findGW = global.get("LORIDANE.funcs.findGW");
	    const gws = global.get("LORIDANE.devices.gw") || [0];
	    let amountOfGws = gws.length; //defaults to 1
	    const indexGW = findGW(UID);
	    const sf = global.get("LORIDANE.devices.gw[0].sf") || 7;
	    let sendtime = size - timeOnAir(50,sf) * (amountOfGws-indexGW);
	    return sendtime;
	}
	
	const timeOnAir = global.get("LORIDANE.funcs.timeOnAir");
	
	//-----------------------------------------------------------------
	// load needed data from context
	const now = Date.now();
	const sf = global.get("LORIDANE.devices.gw[0].sf")||7;
	const TS_SYNC = [19,34,61,111,206,386];
	
	let lastmsg = context.get("lastmsg")||0;
	let startDisk = context.get("startDisk")||lastmsg;
	
	let timedisk = global.get("LORIDANE.timedisk")||{size:1500,count:5};
	let size = timedisk.size;
	let timeinframe = (now-startDisk) % size;
	
	let UID = msg.topic.substring(msg.topic.indexOf("GW"), msg.topic.indexOf("GW") + 14);
	let sendtime = getSendTime(UID);
	let untilsend = size - sendtime - timeinframe;
	
	// check when the timeframe for the gateway is reached
	if(timeinframe > sendtime - timeOnAir(30,sf) || untilsend < 0){
	    untilsend = 2 * size - timeinframe - sendtime;
	    setTimeout(sendmsg,untilsend,msg);
	}else{
	    setTimeout(sendmsg,untilsend,msg);
	    node.status({text:"Delayed msg for "+untilsend+" ms"});
	}
	context.set("lastmsg",now + untilsend);
	
	//check if in the to be confirmed array is old data
	let confirm = global.get("LORIDANE.confirm")||[];
	if (confirm.length > 0){
	    for(var con in confirm){
	        if(now - confirm[con].time >= 10*size){
	            confirm.splice(con,1);
	        }
	    }
	}
	
	//save outgoing msgs to the confirmation scope
	if(msg.payload.startsWith("NO")){
	    obj = {uid: msg.payload.substring(0,14), out:msg.payload, time: now};
	    confirm.push(obj);
	}
	//except sync msgs
	if(msg.payload.includes("cn:")){
	    if (!msg.payload.includes("sync")){
	        nodes = global.get("LORIDANE.devices.nodes");
	        for(var nd in nodes){
	            obj = {uid: nodes[nd].uid, out:msg.payload, time: now};
	            confirm.push(obj);
	        }
	    }else{
	        context.set("startDisk",now+untilsend+TS_SYNC[sf-7]);
	    }
	    
	}
	global.set("LORIDANE.confirm",confirm);
	
	node.status({text:"Delayed msg for "+untilsend+" ms"});
	setTimeout(() => node.status({text:""}),3000);
	return;
}


//id:82c27a6c.0a2258
function add_new_node(msg){
	//if (msg.friendlyname !== undefined){return}
	
	block = flow.get("block")|| false;
	gateways = global.get("LORIDANE.devices.gw")||[];
	setTimeout(()=> node.status({}),5000);
	
	function sendDelayed(arr){
	    node.send(arr);
	}
	
	//reset the config of the gateay after 10 secs to values before
	function resetConfig(){
	    flow.set("block",false);
	    gateways = flow.get("lastGatewayParams")||[];
	    flow.set("lastGatewayParams",[]);
	    
	    for(var gateway in gateways){
	    node.send([null,{payload:`cg:fg:${gateways[gateway].freq / 100000};sg:${gateways[gateway].sf};`,topic:`lora/${gateways[gateway].uid}`}]);
	    }
	    node.status({text:`Reset Configuration to: "cg:fg:${gateways[gateway].freq / 100000};sg:${gateways[gateway].sf};"`});
	    
	}
	
	let timer;
	let gateway;
	
	
	if((msg.topic != "syncfrequency" || msg.topic != "acknowledge" ) && block){
	    node.status({text:"Blocked and Waiting for New Devices"});
	    return;
	}else if(msg.topic == "syncfrequency"){
	    flow.set("block",true);
	    flow.set("lastGatewayParams",gateways),
	    timer = clearTimeout(timer);
	    //gateways = global.get("LORIDANE.devices.gw");
	
	    for(gateway in gateways){
	        node.send([null,{payload:"cg:fg:8670;sg:7;",topic:`lora/${gateways[gateway].uid}`}]);
	        setTimeout(sendDelayed,500,[null,{payload:`cn:fn:${gateways[gateway].freq / 100000};sn:${gateways[gateway].sf};`,topic:`lora/${gateways[gateway].uid}`}]);
	    }
	    node.status({text:`Configuration Sent to GWs: "cg:fg:8670;sg:7;"`});
	    timer = setTimeout(resetConfig,10500);
	    flow.set("timer",timer);
	    return;
	}else if(msg.topic == "acknowledge"){
	    node.send([msg,null]);
	    flow.set("block",true);
	    flow.set("lastGatewayParams",gateways),
	    timer = clearTimeout(timer);
	    gateways = global.get("LORIDANE.devices.gw");
	    msg.data.pay = -1;
	    
	    if (gateways != []){
	        for(gateway in gateways){
	            node.send([msg,{payload:`cn:fn:${gateways[gateway].freq / 100000};sn:${gateways[gateway].sf};`,topic:`lora/${gateways[gateway].uid}`}]);
	        }
	    }else{
	        node.send([msg,{payload:`cn:fn:${msg.data.freq / 100000};sn:${msg.data.sf};`,topic:`lora/${msg.data.gw}`}]);
	    }
	    node.status({text:`Configuration Sent to GWs: "cg:fg:8670;sg:7;"`});
	    timer = setTimeout(resetConfig,10500);
	    flow.set("timer",timer);
	    return;
	}
	
	node.status({text:"Passthrough Mode"});
	
	return [msg,null];
}


//id:4a21c374.73a2cc
function (msg){
	if(msg === null){
	    return;
	}
	return msg;
}


//id:3a9e2be5.c14f04
function (msg){
	if(msg === null){
	    return;
	}
	return msg;
}


//id:77abdcc2.fad7c4
function save_friendlyname(msg){
	if (msg.friendlyname === undefined){
	    return;
	}
	//const USER = global.get("LORIDANE.LinuxUsername");
	const gws = global.get("LORIDANE.devices.gw");
	let nds = global.get("LORIDANE.devices.nodes");
	
	// check which device the friendly name update concerns by uid
	for (var gw in gws){
	    if (msg.friendlyname.uid == gws[gw].uid){
	        gws[gw].friendlyname = msg.friendlyname.name;
	    }
	}
	
	for (var nd in nds){
	    if (msg.friendlyname.uid == nds[nd].uid){
	        nds[nd].friendlyname = msg.friendlyname.name;
	    }
	}
	global.set(["LORIDANE.devices.gw","LORIDANE.devices.nodes"],[gws,nds]);
	
	return {filename:true};
}


//id:aecffc67.3d552
function Save_unknown_devices(msg){
	devices = global.get("LORIDANE.devices")||{gw:[],nodes:[]};
	newConfig = global.get("LORIDANE.classes.newConfig");
	data = msg.config;
	checkUID = global.get("LORIDANE.funcs.checkUID");
	block = global.get("LORIDANE.blockONstart");
	if(block){return;}
	
	//constructor(UID,type,freq,sf,friendlyname,interval,nextgw)
	
	// New Gateway?
	let UID = data.gw;
	const USER = global.get("LORIDANE.LinuxUsername");
	
	let newdevice = true;
	let type = "GW";
	
	for (var device in devices.gw){
	    /*
	    if(devices.gw.length === 0){
	        break;
	    }
	    //*/
	    if(devices.gw[device].uid == UID){
	        node.status({text:"Known Device"});
	        devices.gw[device].lastSeen = data.lastSeen || Date.now();
	        data.friendlyname = devices.gw[device].friendlyname;
	        newdevice = false;
	        changedConf = (devices.gw[device].freq != data.freq || devices.gw[device].sf != data.sf);
	        if (changedConf){
	            devices.gw[device].nextGW = data.gw;
	            devices.gw[device].freq = data.freq //
	            devices.gw[device].sf = data.sf//
	            conf = devices.gw[device];
	            node.send({/*payload:conf,filename:`/home/${USER}/loridaneHWconfig/gateways/${UID}.json`*/});
	            node.status({text:"changed GW conf saved"});
	        }
	    break;
	    }
	}
	
	if(newdevice && UID.startsWith("GW") && checkUID(UID) && data.node != data.gw){
	        conf = new newConfig(UID,type,data.freq,data.sf,data.friendlygw,0,data.friendlygw);
	        devices.gw.push(conf);
	        node.send({/*payload:conf,filename:`/home/${USER}/loridaneHWconfig/gateways/${UID}.json`*/});
	}
	
	
	//New Node?
	newdevice = true;
	UID = data.node;
	type = "energy";
	for (device in devices.nodes){
	    /*
	    if(devices.nodes.length === 0){
	        break;
	    }
	    //*/
	    if(devices.nodes[device].uid == UID){
	        devices.nodes[device].lastinterval = devices.nodes[device].interval;
	        devices.nodes[device].interval = data.lastSeen - devices.nodes[device].lastSeen;
	        devices.nodes[device].lastSeen = data.lastSeen;
	        //data.friendlyname = devices.nodes[device].friendlyname;
	        newdevice = false;
	        changedConf = (devices.nodes[device].freq != data.freq || devices.nodes[device].sf != data.sf || data.gw != devices.nodes[device].nextGW);
	        if (changedConf){ //  if it is not a new unknown uid it might be a changed configuration
	            devices.nodes[device].nextGW = data.gw;
	            devices.nodes[device].freq = data.freq //
	            devices.nodes[device].sf = data.sf//
	            conf = devices.nodes[device];
	            node.send({/*payload:conf,filename:`/home/${USER}/loridaneHWconfig/nodes/${UID}.json`*/});
	            node.status({text:"changed conf saved"});
	        }
	        break;
	    }
	}
	if(newdevice && UID.startsWith("NO") && checkUID(UID)){
	    conf = new newConfig(UID,type,data.freq,data.sf,data.friendlyname,0,data.gw); //uses class definition for new device
	    conf.nextGW = data.gw;
	    conf.tx = 20;
	    devices.nodes.push(conf);
	    node.send({/*payload:conf,filename:`/home/${USER}/loridaneHWconfig/nodes/${UID}.json`*/});
	}
	setTimeout(() => node.status({}),3000);
	msg.config = devices;//data;
	global.set("LORIDANE.devices",devices);
	
	td = global.get("LORIDANE.timedisk");
	if(td === undefined){
	    return null; // null is an empty object but triggers the timedisk function
	}
	
	return;
}


//id:fc54472d.a4ef48
function write_config_file(msg){
	if(msg.filename === undefined){return}
	const fs = global.get("fs");
	var loridane =  global.get("LORIDANE");
	const configpath = loridane.settings.path.config;
	//delete loridane.timedisk;
	delete loridane.homepath;
	delete loridane.settings;
	//loridane.blockONstart = false;
	const loridaneString = JSON.stringify(loridane,null,2);
	fs.writeFileSync(configpath+"memCacheLoridane.json",loridaneString)
	return {payload:loridane};
}


//id:943b015b.8fc56
function (msg){
	function randval(min,max){
	    return min+Math.random()*(max-min);
	}
	
	msg.payload = `{"payload":"NO1234567890AB${randval(1,20000)}",
	    "gw":"GW1234567890AB",
	    "rssi":${Math.round(randval(-120,0))},
	    "snr":${randval(-10,12)},
	    "sf":7,
	    "freq":867000000}`;
	return msg;
}


//id:e5410fa4.8b429
function analyse_payload(msg){
	if(msg.payload[0] == "+"){
	    return;
	}
	
	let pay = [];
	let payloadobject = {};
	
	if(typeof(msg.payload) != "number"){
	    if (msg.payload.includes(";")){
	        pay = msg.payload.split(";");    
	    }else{
	        pay[0] = msg.payload;
	    }
	}else{
	     pay[0] = msg.payload;
	}
	
	// split payloads to  measure0, measure1,....and so on
	let i = 0;
	for(let val of pay){
	    if(typeof(val) == "number"){
	        val = parseFloat(val);
	    }
	    payloadobject[`measure${i}`] = val;
	    i++;
	}
	msg.payload = payloadobject;
	return msg;
}


//id:11d81530.cba6ab
function Set_DataSet(msg){
	let data = msg.data
	const UID = data.node;
	let time = new Date(data.lastSeen)||new Date.now();
	let showtime = time.toLocaleString("de-DE");
	let date = time.toISOString().substr(0,7);
	const USER = global.get("LORIDANE.LinuxUsername");
	
	msg.payload.time = showtime;
	msg.payload.timestamp = data.lastSeen;
	msg.payload.uid = UID;
	
	if(msg.payload !== null)msg.filename = `/home/${USER}/LORIDANE/database/${UID}/${UID}_${date}.json`;
	global.set(`LORIDANE.data.${UID}.lastreading`,msg.payload);
	return msg;
}


//id:c868a2a20ad0f13a
function Extract_Username(msg){
	data = msg.payload;
	
	data = data.split('/');
	let user = data[data.length-1].replace('\n','');
	global.set(["LORIDANE.LinuxUsername","LORIDANE.blockONstart"],[user,true]);
	node.status({text:"Linux Username: "+user});
	msg.user = user;
	return msg;
}


//id:135e5aaf42390a7a
function Load_Devices(msg){
	let nodes = global.get("LORIDANE.devices.nodes");
	let gws = global.get("LORIDANE.devices.gw");
	let options = [];
	
	// as list for the choose device dropdown load the device an if available the friendlyname
	for (var node in nodes){
	    let name = "";
	    if(nodes[node].friendlyname != "" && nodes[node].friendlyname != undefined){
	        name = `${nodes[node].uid} - ${nodes[node].friendlyname}`;
	        options[node] = {[name]:nodes[node].uid};
	    }else{
	        name = `${nodes[node].uid}`;
	        options[node] = {[name]:nodes[node].uid} ;
	    }
	}
	
	return {options:options};
}


//id:bb83ef6a5cd436a5
function show_data(msg){
	device = msg.payload;
	lastreading = global.get(`LORIDANE.data.${device}.lastreading`);
	msg.topic = `Last received Value by ${device}:`;
	msg.payload = JSON.stringify(lastreading,null,2);
	return msg;
}


//id:aca2a067f7c14a0a
function read_directory(msg){
	const databasePath = global.get("LORIDANE.settings.path.database");
	const fs = global.get("fs");
	let files = [];
	let pathes = [];
	
	//--------------------------
	function traverseDir(dir) {
	    if(dir[dir.length-1]!= "/") dir = dir+"/";
	        fs.readdirSync(dir).forEach(file => {
	        let fullPath = dir+file;
	        
	        if (fs.lstatSync(fullPath).isDirectory()) {
	            traverseDir(fullPath);
	        } else {
	            files.push(file.replace(".json",""));
	            pathes.push(fullPath)
	        }  
	   });
	   return pathes;
	}
	//--------------------------
	
	
	traverseDir(databasePath);
	jsons = [];
	
	for (let file of pathes){
	    if(file.endsWith(".json")){
	        jsons.push(file);
	    }
	}
	
	msg.filePaths = jsons;
	return msg;
}


//id:7ac36e992ff6e17a
function get_tail_of_every_file(msg){
	let tailLen;
	if(msg.topic == "tailLen"){
	    context.set("tailLen", msg.payload);
	    return;
	}else{
	    tailLen = context.get("tailLen")||"5";
	}
	
	for(let path of msg.filePaths){
	    node.send({path:`tail -${tailLen} ${path}`, topic: false})
	    //node.warn(path)
	}
	
	return;
}


//id:f9da180cb6c4e409
function parse_json_and_write_file_to_object(msg){
	dataArr = context.get("dataArr") || [];
	
	if(msg.path !== undefined){
	    lastDevice = msg.path.split("/")
	    lastDevice = lastDevice[lastDevice.length -2]
	    context.set("lastDevice",lastDevice);
	}else{
	    lastDevice = context.get("lastDevice")
	}
	
	if (msg.payload !== "" && msg.payload !== undefined){
	    lastLines = msg.payload.split("\n")
	    lastLines.splice(lastLines.length-1,1);
	    for (let line of lastLines){
	        obj = {Device:lastDevice, ...JSON.parse(line)}
	        dataArr.push(obj);
	    }
	    context.set("dataArr",dataArr);
	}
	
	if(msg.topic === true){
	    context.set("dataArr",[]);
	    node.send({payload:[]});
	    dataArr.sort( function(a,b){return b.timestamp - a.timestamp} );
	    return {payload: dataArr};
	}
	return;
}


//id:04de0d0b8bcf8885
function filter_msgs_<_30_seconds(msg){
	const now = Date.now()
	const lasttime = context.get("lasttime") || now;
	let interval = now - lasttime;
	let timer = context.get("timer");
	clearTimeout(timer);
	context.set("timer",timer);
	setTimeout(()=>node.status({}),5000);
	
	if(interval <= 30000){
	    timer = setTimeout(()=>{
	        node.send({payload:now});
	        node.status({text:"Table Updated"})
	        },
	        30000)
	    context.set("timer",timer);
	    node.status({text:"Msg Filtered"})
	    return;
	}
	
	return;
}


//id:f3d923e18e539d3a
function wait_until_timeout(msg){
	let timer = context.get("timer")||null;
	clearTimeout(timer);
	
	context.set("timer",setTimeout(() => node.send({topic:true}),200));
	return msg;
}


//id:9a4d4e82a5b5ba18
function Filter_Nodes_ONRO(msg){
	
	nodes = [
	    "NO94B97EC0C46C",
	    //"NO:94:B9:7E:C0:C3:1C"
	    ];
	
	if (nodes.indexOf(msg.data.node) == -1){
	    return;
	}
	
	pay = msg.payload.split(";");
	
	if(pay[0] == "+"){
	    return;
	}
	watthours = parseFloat(pay[0])
	watts = parseFloat(pay[1])
	msg.payload = {watts:watts,watthours:watthours};
	return msg;
}


//id:875c4592db053187
function Set_DataSet(msg){
	if(msg.topic == "offset"){
	    UID = msg.data.node
	    reading = parseFloat(msg.payload.set.replace(",","."));
	    power = 0;
	    global.set(`LORIDANE.data.${UID}.lastreading`,reading);
	    return;
	}
	//if (isNaN(msg.payload)){return}
	data = msg.data
	UID = data.node;
	time = new Date(data.lastSeen)||new Date.now();
	showtime = time.toLocaleString("de-DE");
	date = time.toISOString().substr(0,7);
	USER = global.get("LORIDANE.LinuxUsername")
	writeConfig = global.get("LORIDANE.funcs.writeConfig");
	
	//----------------------------------------
	//Calc power
	function getpower(input){
	    const now = Date.now();
	    const lasttime = flow.get(`data.${UID}.lasttime`)||0;
	    flow.set(`data.${UID}.lasttime`,now);
	    const msInhours = 3600000;
	
	    interval = now-lasttime;
	    ivperhour= msInhours / interval;
	    value = Math.round(input * ivperhour*100)/100;
	
	    if(value > 55000){
	        return;
	    }
	    return value;
	}
	//------------------------------------------
	//set object
	lastreading = global.get(`LORIDANE.data.${UID}.lastreading`)||0;
	reading = lastreading + (msg.payload.watthours/1000);
	const obj = {
	    reading : reading,
	    power : msg.payload.watts,
	    timestamp : data.lastSeen,
	    time:showtime,
	    powerunit: "Watt",
	    readingunit: "kWh"
	}
	if(obj.reading > 0)global.set(`LORIDANE.data.${UID}.lastreading`,reading);
	if(obj.reading !== null && obj.power !== null){
	    msg.filename = `/home/${USER}/LORIDANE/database/${UID}/${UID}_${date}.json`;
	    writeConfig();
	}
	msg.payload = obj;
	
	return;//  msg;
}


//id:489395b840d57d55
function (msg){
	trigger = msg.payload;
	//trigger.replace(/\r\n|\r|\n/g,"")
	msg = {payload: trigger};
	
	cases = [
	    "Please Enter Your WiFi-SSID",
	    "Please Enter Your WiFi-Password",
	    "Please Enter the Address Of Your MQTT Broker without the Port",
	    "Please Enter the Username Of Your MQTT Broker",
	    "Please Enter the Password for Your MQTT Broker",
	    ]
	
	for(var pat of cases){
	    if (trigger.includes(pat)){
	        return msg;
	    }else{
	        continue;  
	    }
	}
	return;
}


//id:d0db093491b0175f
function Confirmation(msg){
	trigger = msg.payload;
	//trigger.replace(/\r\n|\r|\n/g,"")
	
	msg = {payload: trigger, topic: "Answer:"};
	if(trigger.includes("Message arrived"))return;
	cases = [
	    ", IP address:",
	    "Please Enter Your WiFi-Password",
	    "[WIFI] Connecting to",
	    "MQTT Credentials updated",
	    "Subscribing to topic:",
	    "lora/GW"
	    ]
	
	for(var pat of cases){
	    if (trigger.includes(pat)){
	        return msg;
	    }else{
	        continue;  
	    }
	}
	return;
}


//id:53e53fc1526674a7
function set_ClassA_devs(msg){
	arr = ["NOF008D1C8DC20"];
	global.set("LORIDANE.classA",arr);
	return msg;
}


//id:1d20ac9a4a7e3796
function load_file_to_obj_array(msg){
	fs = global.get("fs"); // equals fs = require('fs')
	const path = msg.filepath;
	file = fs.readFileSync(path,'utf-8').split("\n");
	file.splice(file.length - 1,1);
	let data = [];
	file.forEach(element => data.push(JSON.parse(element)));
	const keys = Object.keys(data[0]);
	
	for(var element in data){
	    for(var key of keys){
	        if (data[element][key] == null || data[element][key] == "inf"){
	            data.splice(element,1);
	            break;
	        }
	    }
	}
	
	msg.data = data;
	return msg;
}


//id:c416bb47d58e7e1d
function define_filepath(msg){
	path = global.get("LORIDANE.settings.path.database");
	now = Date.now();
	time = new Date(now);
	date = time.toISOString().substr(0,7);
	UID = "NO94B97EC0C46C";
	path = path+ `${UID}/${UID}_${date}.json`;
	//node.warn(path)
	msg.params = {
	    starttime: Date.now() - 24*60*60*1000,
	    interval: 24*60*60*1000,
	    costPerKwh: 0.283,
	};
	
	
	msg.filepath = path;
	return msg;
}


//id:e023d10b18a488ed
function mean_power_by_time(msg){
	const interval = msg.params.interval;
	const starttime = msg.params.starttime;
	const endtime = starttime + interval;
	const costPerKwh = msg.params.costPerKwh;
	let data = msg.data;
	const IRO = global.get("LORIDANE.funcs.inRangeOf");
	let powers = [];
	let timespan = [];
	msg.out = {};
	
	//set propwerty Key here
	const powerKey = 'measure1';
	
	for (i = 0; i<data.length;i++){
	    if(IRO(data[i].timestamp,starttime,endtime)){
	        if (!isNaN(data[i][powerKey])){
	            timespan.push(data[i].timestamp);
	            powers.push(parseFloat(data[i][powerKey]));
	        }
	    }
	}
	
	span = timespan[timespan.length-1] - timespan[0];
	
	for (i = 1; i < powers.length; i++){
	    powers[i] *= (timespan[i] - timespan[i-1]);
	}
	
	//node.warn(powers)
	power = powers.reduce((left,right) => left + right);
	power /=  span;
	
	
	msg.out.powers = powers;
	msg.out.meanPower  = power;
	cost = power/1000 * costPerKwh * span/36e5;
	msg.out.costPerInterval = cost;
	return msg;
}


//id:9828211879842201
function load_file_to_obj_array(msg){
	fs = global.get("fs");
	path = msg.filepath;
	file = fs.readFileSync(path,'utf-8').split("\n");
	file.splice(file.length - 1,1);
	data = [];
	file.forEach(element => data.push(JSON.parse(element)));
	keys = Object.keys(data[0]);
	
	for(var element in data){
	    for(var key of keys){
	        if (data[element][key] == null){
	            data.splice(element,1);
	            break;
	        }
	    }
	}
	
	msg.data = data;
	return msg;
}


//id:2989d1d20b53779c
function define_filepath(msg){
	//path = global.get("LORIDANE.settings.path.database");
	now = Date.now();
	time = new Date(now);
	date = time.toISOString().substr(0,10);
	UID = "NO94B97EC0C46C";
	path = `/home/pi/LORIDANE/database/NO94B97EC0C46C/NO94B97EC0C46C_2021-09.json`;
	//node.warn(path)
	msg.params = {
	    starttime: 0,//Date.now() - 24*60*60*1000,
	    interval: Infinity,
	    costPerKwh: 0.283,
	};
	
	
	msg.filepath = path;
	return msg;
}


//id:67e7dc8e5e0d33a7
function (msg){
	data = msg.data
	starttime = data[0].timestamp
	let count = 1
	for(var date of data){
	    delete date.reading
	    delete date.powerunit
	    delete date.readingunit
	    delete date.time
	    date.reltime = date.timestamp - starttime;
	    date.id = "R"+count;
	    count++;
	}
	msg.data = data;
	return msg;
}


//id:7b804f9ff2308e9f
function (msg){
	data = msg.data
	iro = global.get("LORIDANE.funcs.inRangeOf");
	
	for(var i in data){
	    if(iro(data[i].power,0,47)){
	        data[i].pid = "idle"
	    }else if(iro(data[i].power,47,52.5)){
	        data[i].pid = "downstream"
	    }else if(iro(data[i].power,52.5,10)){
	        data[i].pid = "upstream"
	    }else if(iro(data[i].power,55,1000)){
	        data[i].pid = "calculation"
	    }
	}
	msg.data = data;
	return msg;
}


//id:1c032af464f2e330
function (msg){
	data = msg.data
	len = data.length
	data[0].dur = 0;
	for(i=1;i<len;i++){
	    data[i].dur = Math.round((data[i].reltime - data[i-1].reltime)/1e3);
	}
	return msg;
}


//id:8babc9f33f594710
function (msg){
	for (var date of msg.data){
	    node.send({payload:date})
	}
	return;
}


//id:57fd659f2ac85919
function (msg){
	data = msg.data;
	len = data.length
	firstline = "";
	
	function getEdge(bar1,bar2){
	    let edgeweight = 0;
	    let interval = bar2.reltime - bar1.reltime
	    if(bar1.reltime == bar2.reltime)return 0;
	    if(Math.abs(interval > 600000))return 0;
	    //compare power
	        if(bar1.pid == bar2.pid){
	        edgeweight += 1;
	    }
	    if((bar1.pstart && bar2.pstart) ||(bar1.pstart === false && bar2.pstart === false)){
	        edgeweight += 2;
	    }
	    if(Math.abs(interval < 600000)){
	        edgeweight += interval/1e4;
	    }
	    return edgeweight;
	}
	
	for(var date of data){
	    append = ";"+date.id;
	    firstline += append
	}
	node.send({payload:firstline});
	
	for (i=0;i<len;i++){
	    output = ""
	    output += data[i].id
	    for(j=0;j<len;j++){
	       output += ";"+getEdge(data[i],data[j]);
	    }
	    node.send({payload:output})
	}
	
	return;
}


//id:f91cb91215f9d412
function (msg){
	data = msg.data
	len = data.length;
	data[0].pstart = true;
	
	for (i = 2; i<len; i++){
	    if (data[i].pid != data[i-1].pid){
	        data[i].pstart = true
	        data[i-1].pstart = false
	    }
	}
	
	return msg;
}


//id:3126adbea28f66af
function analyse_payload(msg){
	if(msg.payload[0] == "+"){
	    return;
	}
	
	let pay = [];
	let payloadobject = {};
	const fullData = msg.data;
	
	if(typeof(msg.payload) != "number"){
	    if (msg.payload.includes(";")){
	        pay = msg.payload.split(";");    
	    }else{
	        pay[0] = msg.payload;
	    }
	}else{
	     pay[0] = msg.payload;
	}
	
	// split payloads to  measure0, measure1,....and so on
	let i = 0;
	for(let val of pay){
	    if(typeof(val) == "number"){
	        val = parseFloat(val);
	    }
	    payloadobject[`measure${i}`] = val;
	    i++;
	}
	
	msg.payload = {...payloadobject, ...fullData};
	return msg;
}


//id:80c1923731d9fae4
function Set_DataSet(msg){
	let data = msg.data
	let time = new Date(data.lastSeen)||new Date.now();
	let showtime = time.toLocaleString("de-DE");
	let date = time.toISOString().substr(0,7);
	
	msg.payload.time = showtime;
	msg.payload.timestamp = data.lastSeen;
	delete msg.payload.lastSeen;
	
	return msg;
}


//id:58b96b7be58245f6
function (msg){
	if(!msg.payload){
	    return msg;
	}
	return;
}


//id:40c4880ff2097a1c
function Write_to_File(msg){
	const fs = global.get("fs");
	
	fs.appendFile(msg.filename, JSON.stringify(msg.payload)+'\n', err => {
	  if (err) {
	    console.error(err);
	    return
	  }
	  //file written successfully
	})
	node.status({text:msg.filename});
	return msg;
}


//id:ef31e46db222ac56
function Load_Files(msg){
	const fs = global.get("fs");
	const homepath = global.get("LORIDANE.settings.path.database");
	let files = [];
	let pathes = [];
	
	function traverseDir(dir) {
	    if(dir[dir.length-1]!= "/") dir = dir+"/";
	        fs.readdirSync(dir).forEach(file => {
	        let fullPath = dir+file;
	        
	        if (fs.lstatSync(fullPath).isDirectory()) {
	            traverseDir(fullPath);
	        } else {
	            files.push(file.replace(".json",""));
	            pathes.push(fullPath)
	        }  
	   });
	   return pathes;
	}
	
	traverseDir(homepath);
	msg.files = files;
	msg.pathes = pathes;
	return msg;
}


//id:8e09539089fed853
function export_to_CSV(msg){
	const fs = global.get("fs");
	const homepath = global.get("LORIDANE.settings.path.database");
	const files = msg.files;
	const pathes = msg.pathes;
	let content = {};
	const delimiter = global.get("LORIDANE.settings.csvDelimiter")
	// foos-------------------------------------------------
	function parseJSON(str) {
	   try {
	      return JSON.parse(str);
	   }
	   catch (e) {
	      //node.warn(e);
	      return;
	   }
	}
	
	function getFirstLine(obj){
	    let props = Object.keys(obj);
	    return props.join(';')+'\n';
	}
	
	function readFile2Arr(path){
	    let output = [];
	    let lines;
	    const fs = global.get("fs");
	    try {
	        lines = fs.readFileSync(path).toString().split("\n");
	    }
	    catch (e){
	        node.warn(e);
	        return;
	    }
	    
	    for(let line of lines){
	        output.push(parseJSON(line));
	    }
	    return output;
	}
	
	function makeCSV(line){
	    let output = '';
	    let arr;
	    try{
	        arr = Object.values(line);
	    }
	    catch(e){
	        return;
	    }
	    
	    output = arr.join(delimiter);
	    return output + '\n';
	}
	
	function * readFiles(pathes, files){
	    let len = files.length;
	    for (let path in pathes){
	        let fileContent = readFile2Arr(pathes[path]);
	        
	        let firstLine = getFirstLine(fileContent[0]);
	        let file = firstLine;
	        for (let line of fileContent){
	            file += makeCSV(line);
	        }
	        yield {name:files[path]+'.csv',content:file,stateQuo:`Processing File ${parseInt(path)+1} of ${len}.`};
	    }
	}
	//foos end----------------------------------------------------
	let read = readFiles(pathes,files);
	content = read.next();
	while (!content.done) {
	        node.send({topic:content.value.stateQuo,toast:true});
	        fs.writeFileSync(homepath+content.value.name,content.value.content);
	        content = read.next();
	}
	node.send({topic: `All Files exported to CSV. They are in ${homepath}`,toast:false});
	
	return;
}


//id:7f5864c8ac1fc3f8
function write_config(msg){
	writeConfig = global.get("LORIDANE.funcs.writeConfig");
	writeConfig(0 /**delay in ms*/);
	return;
}


//id:778a6a54095672e6
function Process_incoming_Data(msg){
	function extractDecipher(raw){
	    const payIndex = 12;
	    let cipherpay = raw.slice(payIndex, 14);
	    const decrypt = global.get("LORIDANE.funcs.decrypt");
	    //node.warn(cipherpay.join(''))
	    let clearpay = decrypt(cipherpay);
	    //node.warn(clearpay)
	    //node.warn(message)
	    return clearpay;
	}
	
	clear = extractDecipher(msg.payload.toString());
	return {payload: clear.toString()};
}


//id:027a95c7d450c756
function (msg){
	
	decrypt = global.get("LORIDANE.funcs.decrypt");
	plaintext = decrypt(ciphertext.toString());
	
	return {payload:plaintext};
}


