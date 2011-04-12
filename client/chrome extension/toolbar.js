var imagehostURL = "http://localhost/~kmshiva/temp/";

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
		this.bind("change:selected", this.sort);
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
	comparator: function(pageSet) {
		if (pageSet.get("selected"))
			return 0;
		else
			return 1;
	}
});

var PageTagCollection = PageSetCollection.extend({
	model: PageTag
});

// Views
var PageSetView = Backbone.View.extend({

	tagName: "div",
	className: "item",

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
			$(this.el).addClass("selected");
			
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
			$(this.el).addClass("selected");
		else
			$(this.el).removeClass("selected");
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
		"click .search": "showHideSearchBox",
		"click .add": "showHideAddBox",
		"click .search input, .add input": "cancelClickPropagation",
		"keyup .search input": "searchKeyUp",
		"keyup .add input": "addKeyUp"
	},

	render: function() {
		var that = this;
		
		// TODO: can we make refactor this so that the collection does not need to know about the model view?
		$(this.el).children(".item").remove();
		
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
			$(e.currentTarget).removeClass("expanded");
			$(e.currentTarget).children("img").attr("src", imagehostURL + type + ".png");
			$(e.currentTarget).children("input").hide();
		}
		else
		{
			$(e.currentTarget).addClass("expanded");
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
				this.collection.add({"name": newCollectionName});
			
			$(e.currentTarget).parent().click();
		}
	},
	
	commonKeyUp: function(e, type) {
		if (e.which == 27) // escape key
			$(e.currentTarget).parent().click();
	}
});

var PageTagCollectionView = PageSetCollectionView.extend({
	
});


$(document).ready(function() {
	$(document.body).append('<div id="toolbar"> \
		<div id="collections"> \
			<div class="label"> \
				Collections \
			</div> \
			<div class="add">&nbsp; \
				<img src="' + imagehostURL + 'add.png"> \
				<input type="text" value="" style="display: none"></input> \
			</div> \
			<div class="search">&nbsp; \
				<img src="' + imagehostURL + 'search.png"> \
				<input type="text" value="" style="display: none"></input> \
			</div> \
		</div> \
		<div id="tags"> \
			<div class="label"> \
				Tags \
			</div> \
			<div class="add">&nbsp; \
				<img src="' + imagehostURL + 'add.png"> \
				<input type="text" value="" style="display: none"></input> \
			</div> \
			<div class="search">&nbsp; \
				<img src="' + imagehostURL + 'search.png"> \
				<input type="text" value="" style="display: none"></input> \
			</div> \
		</div> \
	</div> \
	<div class="spacerDiv"> \
	&nbsp;</div>'
	);
	
	pageSets = new PageSetCollection([
		{"name": "South America"},
		{"name": "Asia"},
		{"name": "India"},
		{"name": "China"},
		{"name": "Japan"},
		{"name": "Russia"},
		{"name": "Bhutan"},
		{"name": "Nepal"}
	]);

	collectionsView = new PageSetCollectionView({
		collection: pageSets,
		el: $("#collections")[0]
	});

	collectionsView.render();
	
	tagSets = new PageTagCollection([
		{"name": "travel"},
		{"name": "flight"},
		{"name": "brazil"},
		{"name": "hotels"},
		{"name": "cars"},
		{"name": "tourism"}
	]);

	tagsView = new PageTagCollectionView({
		collection: tagSets,
		el: $("#tags")[0]
	});

	tagsView.render();
});