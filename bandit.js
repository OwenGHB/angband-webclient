var fs = require('fs-extra');

//this tells the program how to expect the datafiles to look.
var pattern = {};
//this regex matches an entry in the monster.txt file for instance. others are pretty similar
pattern.monster = /name:.+?\n[^]+?\n\n/g;

//lists of property and subproperty names expected from each file.
//store these outside the program as editable JSON files
var properties = {};
var subproperties = {};

//monster properties
properties.monster = [
	"name","plural","base","glyph","color","info","power","blow","flags","flags_off","spell_freq","spells","desc","drop","drop_artifact","mimic","friends","friends_base"
];

//these 'subproperties' are defined for lines which contain more than piece of information
subproperties.monster = {};
subproperties.monster.name = [
	"serial_number","monster_name"
];
subproperties.monster.info = [
	"speed","hit_points","vision","armor_class","alertness"
];
subproperties.monster.power = [
	"depth","rarity","power","scaled_power","exp_for_kill",
];
subproperties.monster.blow = [
	"attack_method","attack_effect","damage"
];
subproperties.monster.drop = [
	"tval","sval","pct_drop_chance","min","max"
];
subproperties.monster.mimic = [
	"tval","sval"
];
subproperties.monster.friends = [
	"chance","number","name"
];
subproperties.monster.friends_base = [
	"chance","number","name"
];

function parsefile(filename){
	var filedata = fs.readFileSync('/home/angbandlive/etc/angband/gamedata/'+filename+'.txt', 'utf8');
	var data = filedata.match(pattern[filename]);
	var entries = [];
	for (var i=0;i<data.length;i++) {
		//initialize the object to be read into
		var entry = {};
		for (value in properties[filename]) {
			entry[properties[filename][value]]=[];
		}
		//parse the line in the monster entry
		var lines = data[i].split("\n").filter(function(x){return(x!="");});
		for (var j=0;j<lines.length;j++){
			var line=lines[j].split(":");
			//replace '-' in property names because Javascript doesn't like it
			var property=line.shift().replace("-","_");
			//declare the object to be the monster property
			var property_values;
			//handle properties with sub properties
			if (typeof(subproperties[filename][property])!='undefined'){
				property_values = {};
				for (var value in subproperties[filename][property]) {
					property_values[subproperties[filename][property][value]]=line[value];
				}
			} else {
				property_values=line.join(" ").split("|").join(" ");				
			}
			//hack to cope with multiple lines because initialization didn't work
			if (typeof entry[property]=='undefined') entry[property]=[];
			entry[property].push(property_values);
		}
		//hack the hack
		for (var j=0;j<properties[filename].length;j++) {
			if (typeof entry[properties[filename][j]]=='undefined') entry[properties[filename][j]]=[];
		}
		//add our finished object to the list
		entries.push(entry);
	}	
	return entries;
}

function makehtml(filename,filedata){
	var tabheading = $("<div></div>").text(filename);
	tabheading.addClass("tabheading");
	$("#filetabs").append(tabheading);
	var legend = $("<div></div>").text("");
	legend.addClass(filename+"_legend");
	for (var value in properties[filename]) {
		key = $("<div></div>").text(properties[filename][value]);
		key.addClass(filename+"_legend_key");
		legend.append(key);
	}
	$("#"+filename).append(legend);
	for (var i=0;i<filedata.length;i++) {
		var entry = $("<div></div>").text("");
		entry.addClass(filename+"_entry");
		for (value in properties[filename]) {
			var property = $("<div></div>").text("");
			property.addClass(filename+"_property");
			property.addClass(filename+"_property_"+properties[filename][value]);
			for (var j=0;j<filedata[i][properties[filename][value]].length;j++) {
				if (typeof filedata[i][properties[filename][value]][j]=='string') {
					property.append(filedata[i][properties[filename][value]][j]+" "); 
				} else {
					var subvalues=filedata[i][properties[filename][value]][j];
					for (local_value in subproperties[filename][properties[filename][value]]) {
						var subproperty = $("<div></div>").text(subvalues[subproperties[filename][properties[filename][value]][local_value]]);
						subproperty.addClass(filename+"_subproperty");
						subproperty.addClass(filename+"_property_"+properties[filename][value]+"_"+subproperties[filename][properties[filename][value]][local_value]);
						//deal with repeating multi-value properties, keep css out of this code and make up new classes
						//this is probably fixing a mistake from earlier, check back here
						subproperty.addClass(filename+"_subindex_"+j); 
						property.append(subproperty);
					}
				}
			}
			entry.append(property);
		}
		$("#"+filename).append(entry);
	}
}

var jsondata=JSON.stringify(parsefile('monster'));

console.log(jsondata);