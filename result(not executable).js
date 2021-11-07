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
	
	//set property Key here
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


