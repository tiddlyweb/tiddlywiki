// ---------------------------------------------------------------------------------
// Backstage
// ---------------------------------------------------------------------------------

var backstage = {
	backstage: null,
	cloak: null,
	tabs: null,
	panel: null,
	panelBody: null,
	panelFooter: null,
	currTabName: null,
	currTabElem: null,

	init: function() {
		this.cloak = document.getElementById("backstageCloak");
		this.backstage = document.getElementById("backstage");
		this.tabs = document.getElementById("backstageTabs");
		this.panel = document.getElementById("backstagePanel");
		this.panelFooter = createTiddlyElement(this.panel,"div",null,"backstagePanelFooter");
		this.panelBody = createTiddlyElement(this.panel,"div",null,"backstagePanelBody");
		createTiddlyButton(this.panelFooter,"close","Close backstage",backstage.hidePanel);
		this.backstage.onmouseover = function(e) {
			backstage.tabs.style.visibility = "visible";
		};
		this.backstage.onmouseout = function(e) {
			backstage.tabs.style.visibility = "hidden";
		};
		this.cloak.onmousedown = function(e) {
			backstage.switchTab(null);
		};
		createTiddlyText(this.tabs,config.messages.backstagePrompt);
		for(var t=0; t<config.backstageTasks.length; t++) {
			var taskName = config.backstageTasks[t];
			var task = config.tasks[taskName];
			var btn = createTiddlyButton(this.tabs,task.text,task.tooltip,this.onClickTab,"backstageTab");
			btn.setAttribute("task",taskName);
			}
		this.switchTab(null);
	},

	onClickTab: function(e) {
		backstage.switchTab(this.getAttribute("task"));
		return false;
	},

	// Switch to a given tab, or none if null is passed
	switchTab: function(tabName) {
		var tabElem = null;
		var e = this.tabs.firstChild;
		while(e)
			{
			if(e.getAttribute && e.getAttribute("task") == tabName)
				tabElem = e;
			e = e.nextSibling
			}
		if(tabName == backstage.currTabName)
			return;
		if(backstage.currTabElem) {
			removeClass(this.currTabElem,"backstageSelTab");
			}
		if(tabElem && tabName) {
			backstage.preparePanel();
			addClass(tabElem,"backstageSelTab");
			var task = config.tasks[tabName];
			wikify(task.content,backstage.panelBody,null,null)
			backstage.showPanel();
		} else if(backstage.currTabElem) {
			backstage.hidePanel();
		}
		backstage.currTabName = tabName;
		backstage.currTabElem = tabElem;
	},

	preparePanel: function() {
		backstage.cloak.style.height = document.documentElement.scrollHeight + "px";
		backstage.cloak.style.display = "block";
		removeChildren(backstage.panelBody);
		return backstage.panelBody;
	},
	
	showPanel: function() {
		if(anim && config.options.chkAnimate)
			anim.startAnimating(new Slider(backstage.panel,true,false,"none"),new Scroller(backstage.backstage,false));
		else
			{
			backstage.panel.style.display = "block";
			backstage.panel.height = "auto";
			}
		return backstage.panelBody;
	},
	
	hidePanel: function() {
		backstage.currTabName = null;
		backstage.currTabElem = null;
		if(anim && config.options.chkAnimate)
			anim.startAnimating(new Slider(backstage.panel,false,false,"none"));
		else
			backstage.panel.style.display = "none";
		backstage.cloak.style.display = "none";
	},
	
	setButtons: function(buttons,callback) {
		removeChildren(backstage.panelFooter);
		for(t=0; t<buttons.length; t++)
			{
			var a = buttons[t];
			if(a && a.name != "")
				createTiddlyButton(backstage.panelFooter,a.caption,a.tooltip,function (e) {a.onclick.apply(this,arguments); return false;});
			}
	}
};

config.macros.backstage = {};

config.macros.backstage.handler = function(place,macroName,params,wikifier,paramString,tiddler)
{
	var backstageTask = config.tasks[params[0]];
	if(backstageTask)
		createTiddlyButton(place,backstageTask.text,backstageTask.tooltip,function(e) {backstage.switchTab(params[0]); return false;})
}
