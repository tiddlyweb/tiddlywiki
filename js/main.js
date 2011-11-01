//--
//-- Main
//--

var params = null; // Command line parameters
var store = null; // TiddlyWiki storage
var story = null; // Main story
var formatter = null; // Default formatters for the wikifier
var anim = typeof Animator == "function" ? new Animator() : null; // Animation engine
var readOnly = false; // Whether we're in readonly mode
var highlightHack = null; // Embarrassing hack department...
var hadConfirmExit = false; // Don't warn more than once
var safeMode = false; // Disable all plugins and cookies
var showBackstage; // Whether to include the backstage area
var installedPlugins = []; // Information filled in when plugins are executed
var startingUp = false; // Whether we're in the process of starting up
var pluginInfo,tiddler; // Used to pass information to plugins in loadPlugins()

jQuery(document).ready(function() {

jQuery("#contentWrapper").addClass("loading").text("Loading Space...");

var total_tiddlers = -1;
ajaxReq({ dataType: "text", url: "/tiddlers", success: function(text) {
	total_tiddlers = text.split("\n").length;
}
});

ajaxReq({ dataType: "json", url: "/status", success: function(status) {
	var host = window.location.protocol + "//" + window.location.hostname;
	var workspace = "recipes/" + status["space"]["recipe"];
	config.defaultCustomFields = {
		"server.workspace": workspace,
		"server.type": "tiddlyweb",
		"server.host": host
	};
	var defaults = config.defaultCustomFields;
	var filter = "?select=tag:excludeLists&type:!text/css&select=type:!text/html&select=type:!image/png&select=type:!image/jpg&select=type:!image/gif&select=type:!image/jpeg";
	var time = 0, start = 0, total = 50;
	var lazy_load_content = function(title) {
		window.setTimeout(function() {
			if(time < 0) {
				return;
			}
			ajaxReq({
				dataType: "json",
				data: {
					"fat": "y"
				},
				url: host + "/tiddlers?sort=-modified&limit=" + start + "," + total,
				success: function(tids) {
					for(var i = 0; i < tids.length; i++) {
						var tid = config.adaptors.tiddlyweb.toTiddler(tids[i], host);
						store.addTiddler(tid);
					}
					if(total_tiddlers > -1) {
						var pc = 100 - Math.floor(((total_tiddlers - store.getTiddlers().length) / total_tiddlers) * 100);
						displayMessage(pc + "% of document loaded.");
					}
					if(tids.length === 0) {
						time = -1;
					} else {
						refreshDisplay();
						start += total;
						time += 100;
						lazy_load_content(title);
					}
				},
			});
		}, time);
	}
	var success = function(json) {
		store = new TiddlyWiki({config:config});
		invokeParamifier(params,"oninit");
		story = new Story("tiddlerDisplay","tiddler");
		jQuery("#contentWrapper").removeClass("loading");
		for(var i = 0; i < json.length; i++) {
			var title = json[i].title;
			if(["ServerSideSavingPlugin",
				"TiddlySpaceInit", "TiddlyWebAdaptor", "LoadMissingTiddlersPlugin"].indexOf(title) === -1) {
				var tid = config.adaptors.tiddlyweb.toTiddler(json[i], host);
				store.addTiddler(tid);
			}
		}
		lazy_load_content();
		main();
	};
	ajaxReq({
		dataType: "json",
		data: {
			"fat": "y"
		},
		url: host + "/" + workspace + "/tiddlers" + filter,
		success: function(tiddlers) {
			success(tiddlers);
		},
		error: function() {
			jQuery("#contentWrapper").addClass("error").text("Error occurred loading your tiddlers");
		}
	});
}});
});

// Starting up
function main()
{
	var t10,t9,t8,t7,t6,t5,t4,t3,t2,t1,t0 = new Date();
	startingUp = true;
	var doc = jQuery(document);
	jQuery.noConflict();
	window.onbeforeunload = function(e) {if(window.confirmExit) return confirmExit();};
	params = getParameters();
	if(params)
		params = params.parseParams("open",null,false);
	addEvent(document,"click",Popup.onDocumentClick);
	var s;
	for(s=0; s<config.notifyTiddlers.length; s++)
		store.addNotification(config.notifyTiddlers[s].name,config.notifyTiddlers[s].notify);
	t1 = new Date();
	loadShadowTiddlers();
	doc.trigger("loadShadows");
	t2 = new Date();
	store.loadFromDiv("storeArea","store",true);
	doc.trigger("loadTiddlers");
	loadOptions();
	t3 = new Date();
	invokeParamifier(params,"onload");
	t4 = new Date();
	readOnly = (window.location.protocol == "file:") ? false : config.options.chkHttpReadOnly;
	var pluginProblem = loadPlugins("systemConfig");
	doc.trigger("loadPlugins");
	t5 = new Date();
	formatter = new Formatter(config.formatters);
	invokeParamifier(params,"onconfig");
	story.switchTheme(config.options.txtTheme);
	showBackstage = showBackstage !== undefined ? showBackstage : !readOnly;
	t6 = new Date();
	var m;
	for(m in config.macros) {
		if(config.macros[m].init)
			config.macros[m].init();
	}
	t7 = new Date();
	store.notifyAll();
	t8 = new Date();
	restart();
	refreshDisplay();
	t9 = new Date();
	if(pluginProblem) {
		story.displayTiddler(null,"PluginManager");
		displayMessage(config.messages.customConfigError);
	}
	t10 = new Date();
	if(config.options.chkDisplayInstrumentation) {
		displayMessage("LoadShadows " + (t2-t1) + " ms");
		displayMessage("LoadFromDiv " + (t3-t2) + " ms");
		displayMessage("LoadPlugins " + (t5-t4) + " ms");
		displayMessage("Macro init " + (t7-t6) + " ms");
		displayMessage("Notify " + (t8-t7) + " ms");
		displayMessage("Restart " + (t9-t8) + " ms");
		displayMessage("Total: " + (t10-t0) + " ms");
	}
	startingUp = false;
	doc.trigger("startup");
}

// Called on unload. All functions called conditionally since they themselves may have been unloaded.
function unload()
{
	if(window.checkUnsavedChanges)
		checkUnsavedChanges();
	if(window.scrubNodes)
		scrubNodes(document.body);
}

// Restarting
function restart()
{
	invokeParamifier(params,"onstart");
	if(story.isEmpty()) {
		story.displayDefaultTiddlers();
	}
	window.scrollTo(0,0);
}

function loadShadowTiddlers()
{
	var shadows = new TiddlyWiki();
	shadows.loadFromDiv("shadowArea","shadows",true);
	shadows.forEachTiddler(function(title,tiddler){config.shadowTiddlers[title] = tiddler.text;});
}

function loadPlugins(tag)
{
	if(safeMode)
		return false;
	var tiddlers = store.getTaggedTiddlers(tag);
	//# ensure the plugins are sorted into case sensitive order
	tiddlers.sort(function(a,b) {return a.title < b.title ? -1 : (a.title == b.title ? 0 : 1);});
	var toLoad = [];
	var nLoaded = 0;
	var map = {};
	var nPlugins = tiddlers.length;
	installedPlugins = [];
	var i;
	for(i=0; i<nPlugins; i++) {
		var p = getPluginInfo(tiddlers[i]);
		installedPlugins[i] = p;
		var n = p.Name || p.title;
		if(n)
			map[n] = p;
		n = p.Source;
		if(n)
			map[n] = p;
	}
	var visit = function(p) {
		if(!p || p.done)
			return;
		p.done = 1;
		var reqs = p.Requires;
		if(reqs) {
			reqs = reqs.readBracketedList();
			var i;
			for(i=0; i<reqs.length; i++)
				visit(map[reqs[i]]);
		}
		toLoad.push(p);
	};
	for(i=0; i<nPlugins; i++)
		visit(installedPlugins[i]);
	for(i=0; i<toLoad.length; i++) {
		p = toLoad[i];
		pluginInfo = p;
		tiddler = p.tiddler;
		if(isPluginExecutable(p)) {
			if(isPluginEnabled(p)) {
				p.executed = true;
				var startTime = new Date();
				try {
					if(tiddler.text)
						window.eval(tiddler.text);
					nLoaded++;
				} catch(ex) {
					p.log.push(config.messages.pluginError.format([exceptionText(ex)]));
					p.error = true;
					if(!console.tiddlywiki) {
						console.log("error evaluating " + tiddler.title, ex);
					}
				}
				pluginInfo.startupTime = String((new Date()) - startTime) + "ms";
			} else {
				nPlugins--;
			}
		} else {
			p.warning = true;
		}
	}
	return nLoaded != nPlugins;
}

function getPluginInfo(tiddler)
{
	var p = store.getTiddlerSlices(tiddler.title,["Name","Description","Version","Requires","CoreVersion","Date","Source","Author","License","Browsers"]);
	p.tiddler = tiddler;
	p.title = tiddler.title;
	p.log = [];
	return p;
}

// Check that a particular plugin is valid for execution
function isPluginExecutable(plugin)
{
	if(plugin.tiddler.isTagged("systemConfigForce")) {
		plugin.log.push(config.messages.pluginForced);
		return true;
	}
	if(plugin["CoreVersion"]) {
		var coreVersion = plugin["CoreVersion"].split(".");
		var w = parseInt(coreVersion[0],10) - version.major;
		if(w == 0 && coreVersion[1])
			w = parseInt(coreVersion[1],10) - version.minor;
		if(w == 0 && coreVersion[2])
			w = parseInt(coreVersion[2],10) - version.revision;
		if(w > 0) {
			plugin.log.push(config.messages.pluginVersionError);
			return false;
		}
	}
	return true;
}

function isPluginEnabled(plugin)
{
	if(plugin.tiddler.isTagged("systemConfigDisable")) {
		plugin.log.push(config.messages.pluginDisabled);
		return false;
	}
	return true;
}

