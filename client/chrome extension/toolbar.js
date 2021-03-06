var imagehostURL = "http://localhost/~kmshiva/temp/";

function getPageAccessId()
{
	var inp = document.getElementById("accessId");
	if (inp != null)
	{
		var accessID = inp.getAttribute("value");
		return accessID;
	}
	else
		return null;
}

// Models
var PageSet = Backbone.Model.extend({
	initialize: function() {
		if (!this.get("selected"))
			this.set({"selected": false});
			
		if (!this.get("visible"))
			this.set({"visible": true});
	}
});

var PageTag = PageSet.extend({
	
});

// Collections
var PageSetCollection = Backbone.Collection.extend({
	model: PageSet,
	initialize: function() {
		this.bind("change:selected", this.onPageSetSelectedChange);
		this.bind("add", this.onAdd);
	},
	searchNames: function(searchText) {
		var reg = new RegExp(searchText, "i");
		
		return this.models.filter(function(pageSet) {
			if (searchText.length > 0)
				return pageSet.get("name").search(reg) != -1;
			else
				return true;
		});
	},
	selectCollection: function(collectionName) {
		alert("session: searching for collection" + collectionName);
		for (var i = 0; i < this.models.length; i++)
		{
			alert("session:" + this.models[i].get("name"));
			if (this.models[i].get("name") == collectionName)
			{
				alert("session: found" + this.models[i].get("name"));
				this.models[i].set({"selected": true});
				return;
			}
		}
	},
	comparator: function(pageSet) {
		if (pageSet.get("selected"))
			return 0;
		else
			return 1;
	},
	onPageSetSelectedChange: function(pageSet, selected)
	{
		this.sort();
		var action = "";
		if (this instanceof PageTagCollection)
		{
			action = selected ? "addTagForURL" : "removeTagFromURL";
			chrome.extension.sendRequest({action: action, accessId: getPageAccessId(), tag: pageSet.get("name")}, function() {
				console.log("done", action);
			});
		}
		else
		{
			action = selected ? "addToCollection" : "removeFromCollection";
			chrome.extension.sendRequest({action: action, accessId: getPageAccessId(), collectionName: pageSet.get("name")}, function() {
				console.log("done", action);
			});
		}
	},
	onAdd: function(pageSet)
	{
		if (this instanceof PageTagCollection)
		{
			chrome.extension.sendRequest({action: "addTagForURL", tag: pageSet.get("name"), accessId: getPageAccessId()}, function() {
				console.log("added new tag");
			});
		}
		else
		{
			chrome.extension.sendRequest({action: "insertCollection", collectionName: pageSet.get("name"), accessId: getPageAccessId()}, function() {
				console.log("added new collection");
			});
		}
	}
});

var PageTagCollection = PageSetCollection.extend({
	model: PageTag
});

// Views
var PageSetView = Backbone.View.extend({

	tagName: "div",
	className: "KBitem",

	template: _.template("<%= name %>"),
	
	events: {
		"click": "onClick"
	},
	
	initialize: function() {
		_.bindAll(this, "render", "select", "visible");
		
		this.model.bind("change:name", this.render);
		this.model.bind("change:selected", this.select);
		this.model.bind("change:visible", this.visible);
	},

	render: function() {
		$(this.el).html(this.template(this.model.toJSON()));
		if (this.model.get("selected"))
			$(this.el).addClass("KBselected");
			
		if (!this.model.get("visible"))
			$(this.el).hide();

		return this;
	},
	
	onClick: function() {
		if (this.model.get("selected"))
			this.model.set({"selected": false});
		else
			this.model.set({"selected": true});
	},
	
	select: function() {
		if (this.model.get("selected"))
			$(this.el).addClass("KBselected");
		else
			$(this.el).removeClass("KBselected");
	},
	
	visible: function() {
		if (this.model.get("visible"))
			$(this.el).show();
		else
			$(this.el).hide();				
	}
	
});

var PageTagView = PageSetView.extend({
	
});

var PageSetCollectionView = Backbone.View.extend({
	initialize: function() {
		_.bindAll(this, "render", "add", "showHideInputBox");
		
		this.collection.bind("add", this.add);
		this.collection.bind("refresh", this.render);
	},
	
	events: {
		"click .KBstar": "star",
		"click .KBsearch": "showHideSearchBox",
		"click .KBadd": "showHideAddBox",
		"click .KBsearch input, .KBadd input": "cancelClickPropagation",
		"keyup .KBsearch input": "searchKeyUp",
		"keyup .KBadd input": "addKeyUp"
	},

	render: function() {
		var that = this;
		
		// TODO: can we make refactor this so that the collection does not need to know about the model view?
		$(this.el).children(".KBitem").remove();
		
		// _(this.pageSetViews).each(function(psv) {
		// 	$(that.el).append(psv.render().el);
		// });
		
		this.collection.each(function(pageSet) {
			$(that.el).append(new PageSetView({model: pageSet}).render().el);
		});
		
		return this;
	},

	add: function(pageSet) {
		// var psv = new PageSetView({model: pageSet});
		// this.pageSetViews.push(psv);
		// $(this.el).append(psv.render().el);
		
		this.render();
	},
	
	showHideSearchBox: function(e) {
		this.showHideInputBox(e, "search");
		this.showAllCollections();
	},
	
	showHideAddBox: function(e) {
		this.showHideInputBox(e, "add");
	},
	
	showHideInputBox: function(e, type) {
		if ($(e.currentTarget).children("input:visible").length > 0)
		{
			$(e.currentTarget).removeClass("KBexpanded");
			$(e.currentTarget).children("img").attr("src", imagehostURL + type + ".png");
			$(e.currentTarget).children("input").hide();
		}
		else
		{
			$(e.currentTarget).addClass("KBexpanded");
			$(e.currentTarget).children("img").attr("src", imagehostURL + "cancel.png");
			$(e.currentTarget).children("input").show().val("");
			
			var inp = $(e.currentTarget).children("input")[0];
			setTimeout(function() { $(inp).focus(); }, 210);
		}
	},
	
	cancelClickPropagation: function(e) {
		e.stopPropagation();
	},
	
	showAllCollections: function() {
		_.each(this.collection.models, function(pageSet) { pageSet.set({"visible": true}); });
	},
	
	searchKeyUp: function(e) {
		this.commonKeyUp(e, "search");
		
		if (e.which == 27) // escape key
		{
			this.showAllCollections();
		}
		else if (e.which == 13) // enter key
		{
			var visibleModels = _.filter(this.collection.models, function(pageSet){ return pageSet.get("visible"); });
			
			if (visibleModels.length > 0)
			{
				var firstVisibleModel = visibleModels[0];
				if (firstVisibleModel.get("selected"))
					firstVisibleModel.set({"selected": false});
				else
					firstVisibleModel.set({"selected": true});
			}
		}
		else
		{
			var searchResults = this.collection.searchNames($(e.currentTarget).val());
			
			_.each(this.collection.models, function(pageSet) { pageSet.set({"visible": false}); });
			_.each(searchResults, function(result) { result.set({"visible": true}); });
		}
	},
	
	addKeyUp: function(e) {
		console.log("add", e.which);
		this.commonKeyUp(e, "add");
		
		if (e.which == 13) // enter key
		{
			var newCollectionName = $(e.currentTarget).val();
			if (newCollectionName.length > 0)
				this.collection.add({"name": newCollectionName, "selected": true});
			
			$(e.currentTarget).parent().click();
		}
	},
	
	commonKeyUp: function(e, type) {
		if (e.which == 27) // escape key
			$(e.currentTarget).parent().click();
	},
	star: function(e) {
		console.log(this);
		var action = "";
		if ($(e.currentTarget).hasClass("KBstarred"))
		{
			action = "unstar";
			$(e.currentTarget).removeClass("KBstarred");
		}
		else
		{
			action = "star";
			$(e.currentTarget).addClass("KBstarred");
		}

		chrome.extension.sendRequest({action: action, accessId: getPageAccessId()}, function() {
			console.log("done", action);
		});
	}
});

var PageTagCollectionView = PageSetCollectionView.extend({
	
});


$(document).ready(function() {
	$(document.body).append('<div id="KBtoolbar"> \
		<div id="KBcollections"> \
			<img class="KBstar" src="' + imagehostURL + 'star.png"> \
			<img class="KBannotate" src="' + imagehostURL + 'pencil.png"> \
			<div class="KBlabel"> \
				Collections \
			</div> \
			<div class="KBadd">&nbsp; \
				<img src="' + imagehostURL + 'add.png"> \
				<input type="text" value="" style="display: none"></input> \
			</div> \
			<div class="KBsearch">&nbsp; \
				<img src="' + imagehostURL + 'search.png"> \
				<input type="text" value="" style="display: none"></input> \
			</div> \
		</div> \
		<div id="KBtags"> \
			<div class="KBlabel"> \
				Tags \
			</div> \
			<div class="KBadd">&nbsp; \
				<img src="' + imagehostURL + 'add.png"> \
				<input type="text" value="" style="display: none"></input> \
			</div> \
			<div class="KBsearch">&nbsp; \
				<img src="' + imagehostURL + 'search.png"> \
				<input type="text" value="" style="display: none"></input> \
			</div> \
		</div> \
	</div> \
	<div class="KBspacerDiv"> \
	&nbsp;</div>'
	);
	
	chrome.extension.sendRequest({action: "getAllCollections"}, function(data) {
		if (data)
		{
			data = $.parseJSON(data);
			pageSets = new PageSetCollection(data);

			collectionsView = new PageSetCollectionView({
				collection: pageSets,
				el: $("#KBcollections")[0]
			});

			collectionsView.render();
			
			chrome.extension.sendRequest({action: "getCurrentSession"}, function(collectionName) {
				if (collectionName != "")
				{
					alert("session:" + collectionName);
					pageSets.selectCollection(collectionName);
				}
			});
		}
	});
	
	chrome.extension.sendRequest({action: "getTagsForURLFromDelicious", "url": window.location.href}, function(data) {
		
		tagSets = new PageTagCollection(data);

		tagsView = new PageTagCollectionView({
			collection: tagSets,
			el: $("#KBtags")[0]
		});

		tagsView.render();
	});
	
	chrome.extension.sendRequest({action: "takeSnapshot", url: window.location.href, title: document.title}, function(data) {
		console.log("snapshot done!");
	});
});