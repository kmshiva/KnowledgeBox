$(document).ready(function() {
	var SCREEN_WIDTH = 1200;

	var SNAPSHOT_WIDTH = 260;
	var SNAPSHOT_HEIGHT = 200;
	
	var appView = null;
	var gridLayout = null;
	// Models

	var KBPage = Backbone.Model.extend({
		initialize: function(attributes) {
			if (!attributes)
			{
				this.set({
					accessId: null,
					snapshot: "",
					snapshotThumb: "",
					text: "",
					starred: false,
					tags: [],
					collection: "",
					url: "",
					accessTime: "",
					timeSpent: 0,
					score: 0
				}, {silent: true});
			}
		}
	});

	var KBCollection = Backbone.Model.extend({
		initialize: function(attributes) {
			if (!attributes)
			{
				this.set({
					name: "",
					pages: []
				}, {silent: true});
			}
			else
			{
				var pages = this.get("pages");
				for (var i = 0; i < pages.length; i++)
				{
					pages[i] = new KBPage(pages[i]);
				}
			}
		}
	});

	var KBTag = Backbone.Model.extend({
		initialize: function(attributes) {
			if (!attributes)
			{
				this.set({
					name: "",
					pages: []
				}, {silent: true});
			}
		}
	});

	// Collections

	var KBPageCollection = Backbone.Collection.extend({
		model: KBPage
	});

	var KBCollectionCollection = Backbone.Collection.extend({
		model: KBCollection
	});

	var KBTagCollection = Backbone.Collection.extend({
		model: KBTag
	});


	// Views

	var PageView = Backbone.View.extend({
		initialize: function() {
			_.bindAll(this, "render", "move", "getLayoutItems", "onOpenURL", "onViewText", "onDelete", "onSnapshotClick");
			this.paper = this.options.paper;
			
			this.x = this.options.x ? this.options.x : 0;
			this.y = this.options.y ? this.options.y : 0;
			this.width = SNAPSHOT_WIDTH;
			this.height = SNAPSHOT_HEIGHT;
			
			this.svgSet = this.paper.set();
			var snapshot = "";
			if (this.model.get("snapshotThumb"))
				snapshot = this.model.get("snapshotThumb");
			else
				snapshot = "http://localhost:8080/static/images/placeholder.jpg";
				
			this.snapshot = this.paper.image(snapshot, 0, 0, this.width, this.height);
			this.snapshot.attr({"cursor": "hand"});
			this.snapshot.click(this.onSnapshotClick);
			this.border = this.paper.rect(0, 0, this.width, this.height);
			this.border.attr({"stroke": "black", "stroke-width": 1});
			this.svgSet.push(this.snapshot);
			this.svgSet.push(this.border);
			
			this.star = this.paper.image("http://localhost:8080/static/images/star.png", 0, this.height + 6, 16, 16);
			if (this.model.get("starred"))
				this.star.attr({"opacity": "1.0"});
			else
				this.star.attr({"opacity": "0.1"});
			this.svgSet.push(this.star);
			
			this.title = this.paper.text(20, this.height+15, this.model.get("page_title") ? this.model.get("page_title").substr(0, 40) : "");
			this.title.attr({"text-anchor": "start"});
			this.title.attr({ "font-size": 12, "font-family": "Helvetica, Arial, sans-serif" });
			this.svgSet.push(this.title);
			
			this.tags = this.paper.text(0, this.height+25, this.model.get("tags") ? this.model.get("tags").join(",").substr(0, 50) : "");
			this.tags.attr({"text-anchor": "start"});
			this.svgSet.push(this.tags);
			
			// this.svgSet.click(this.onClick);
			// this.svgSet.hover(this.onMouseOver, this.onMouseOut);
			
			
			// this.controlsSet = this.paper.set();
			
			this.controlsOverlay = this.paper.rect(this.width - 32, 0, 32, this.height);
			this.controlsOverlay.attr({"stroke-width": 0, "fill": "black", "opacity": 0.2});
			this.svgSet.push(this.controlsOverlay);
			
			this.btnOpenURL = this.paper.image("http://localhost:8080/static/images/open-in-new-window-inv.png",
			 									this.width - 24, 8, 				16, 16);
			this.btnOpenURL.hover(this.onControlsMouseOver, this.onControlsMouseOut);
			this.btnOpenURL.attr({"opacity": 0.2});
			this.btnOpenURL.click(this.onOpenURL);
			this.svgSet.push(this.btnOpenURL);
			
			this.btnViewText = this.paper.image("http://localhost:8080/static/images/view-text-inv.gif",
												this.width - 24, 30, 				16, 16);
			this.btnViewText.hover(this.onControlsMouseOver, this.onControlsMouseOut);
			this.btnViewText.attr({"opacity": 0.2});
			this.btnViewText.click(this.onViewText);
			this.svgSet.push(this.btnViewText);
			
			this.btnDelete = this.paper.image("http://localhost:8080/static/images/cancel-inv.png",
												this.width - 24, this.height - 24, 	16, 16);
			this.btnDelete.hover(this.onControlsMouseOver, this.onControlsMouseOut);
			this.btnDelete.attr({"opacity": 0.3});
			this.btnDelete.click(this.onDelete);
			this.svgSet.push(this.btnDelete);
			
			// this.controlsSet.attr({"opacity": "0.5"});
			// this.controlsSet.hover(function(evt) {
			// 	this.attr({"opacity": 1.0});
			// }, function(evt) {
			// 	this.attr({"opacity": 0.5});
			// });
			
			// this.svgSet.push(this.controlsSet);
			
			this.hide();
		},
		onSnapshotClick: function(evt) {
			// window.open(this.model.get("url"));
			console.log(this.snapshot);
			$.fancybox({
						//'orig'			: $(this),
						'orig'			: this.snapshot.node,
						'padding'		: 0,
						'href'			: this.model.get("snapshot"),
						'title'   		: this.model.get("page_title"),
						'transitionIn'	: 'elastic',
						'transitionOut'	: 'elastic'
			});
		},
		onControlsMouseOver: function(evt) {
			this.attr({"opacity": 1.0});
		},
		onControlsMouseOut: function(evt) {
			this.attr({"opacity": 0.2});
		},
		onOpenURL: function(evt) {
			if (this.model.get("url"))
			{
				window.open(this.model.get("url"));
			}
		},
		onViewText: function(evt) {
			$.fancybox("<div>" + this.model.get("text") + "</div>");
			// if (this.model.get("text"))
			// {
			// 	var win = window.open();
			// 	win.document.write(this.model.get("text"));
			// }
		},
		onDelete: function(evt) {
			
		},
		render: function(layoutItems, animate) {
			this.show();
			
			// this.svgSet.translate(layoutItems[0].x, layoutItems[0].y);
			this.move(layoutItems[0].x, layoutItems[0].y, layoutItems[0].delay ? layoutItems[0].delay : 0, animate);
		},
		move: function(newX, newY, delay, animate)
		{
			if (animate)
			{
				var self = this;
				setTimeout(function() {
					self.svgSet.animate({translation: "" + (newX - self.x) + " " + (newY - self.y)}, delay, ">");
					self.x = newX;
					self.y = newY;
				}, delay ? 0 : delay);
			}
			else
			{
				this.svgSet.translate(newX - this.x, newY - this.y);
				this.x = newX;
				this.y = newY;
			}
		},
		getLayoutItems: function()
		{
			return [{x: this.x, y: this.y}];
		},
		hide: function() {
			this.svgSet.hide();
		},
		show: function() {
			this.svgSet.show();
		},
		remove: function() {
			this.svgSet.remove();
		}
	});

	var PageTextView = Backbone.View.extend({
	
	});

	var PageCollectionView = Backbone.View.extend({
		initialize: function() {
			_.bindAll(this, "render", "move", "getLayoutItems", "onClick");
			this.paper = this.options.paper;
			
			this.x = this.options.x ? this.options.x : 0;
			this.y = this.options.y ? this.options.y : 0;
			this.width = SNAPSHOT_WIDTH;
			this.height = SNAPSHOT_HEIGHT;
			
			this.collapsed = true;
			this.pageViews = [];
			
			this.svgSet = this.paper.set();
			var placeholder = this.paper.image("http://localhost:8080/static/images/collectionPlaceholder.jpg", 0, 0, this.width, this.height);
			var r = this.paper.rect(0, 0, this.width, this.height);
			r.attr({"stroke": "blue", "stroke-width": 1, "fill": "lightGrey"});
			this.title = this.paper.text(0, this.height+15, this.model.get("name") ? this.model.get("name").substr(0, 40) : "");
			this.title.attr({"text-anchor": "start"});
			this.title.attr({ "font-size": 12, "font-family": "Helvetica, Arial, sans-serif", "font-weight": "bold" });
			this.svgSet.push(this.title);
			this.svgSet.push(placeholder);
			this.svgSet.push(r);
			
			this.svgSet.click(this.onClick);
			
			var self = this;
			_.each(this.model.get("pages"), function(page) {
				self.pageViews.push(new PageView({model: page, paper: self.paper}));
			});
		},
		onClick: function(evt) {
			console.log("clicked!");
			this.collapsed = !this.collapsed;
			if (this.collapsed)
				this.trigger("collapsed");
			else
				this.trigger("expanded");
		},
		render: function(layoutItems, animate) {
			if (this.collapsed)
			{
				this.show();
				
				_.each(this.pageViews, function(pageView) {
					pageView.hide();
				});

				// this.svgSet.translate(layoutItems[0].x, layoutItems[0].y);
				this.move(layoutItems[0].x, layoutItems[0].y, layoutItems[0].delay, animate);
			}
			else
			{
				this.move(layoutItems[0].x, layoutItems[0].y, layoutItems[0].delay, animate);
				
				var self = this;
				_.each(this.pageViews, function(pageView, index) {
					pageView.show();
					pageView.render([layoutItems[index+1]], animate);
				});
			}
		},
		move: function(newX, newY, delay, animate) {
			if (animate)
			{
				var self = this;
				setTimeout(function() {
					self.svgSet.animate({translation: "" + (newX - self.x) + " " + (newY - self.y)}, delay, ">");
					self.x = newX;
					self.y = newY;
				}, delay ? 0 : delay);
			}
			else
			{
				this.svgSet.translate(newX - this.x, newY - this.y);
				this.x = newX;
				this.y = newY;
			}
		},
		getLayoutItems: function() {
			if (this.collapsed)
				return [{x: this.x, y: this.y}];
			else
			{
				var self = this;
				layoutItems = _.map(self.pageViews, function(pageView) { return {x:pageView.x, y:pageView.y}; });
				layoutItems.unshift({x: this.x, y: this.y});
				return layoutItems;
			}
		},
		hide: function() {
			this.svgSet.hide();
		},
		show: function() {
			this.svgSet.show();
		},
		remove: function() {
			this.svgSet.remove();
		}
	});
	
	var GridLayoutView = Backbone.View.extend({
		initialize: function() {
			_.bindAll(this, "render", "addView");
			this.views = [];
		},
		addView: function(view) {
			this.views.push(view);
			if (view instanceof PageCollectionView)
			{
				var self = this;
				view.bind("collapsed", function() {self.render(true);});
				view.bind("expanded", function() {self.render(true);});
			}
		},
		render: function(animate) {
			var x = 20, y = 20, delay = 10;
			var itemCount = 0;
			
			_.each(this.views, function(view) {
				var layoutItems = view.getLayoutItems();
				
				_.each(layoutItems, function(layoutItem) {
					layoutItem.x = x;
					layoutItem.y = y;
					layoutItem.delay = delay;
					
					x += SNAPSHOT_WIDTH + 40;
					if (x > 1000)
					{
						x = 20;
						y += SNAPSHOT_HEIGHT + 60;
					}
					
					delay += 50;
					itemCount++;
				});
				
				if (itemCount > 20)
					view.render(layoutItems, false);
				else
					view.render(layoutItems, animate);
			});
		},
		clear: function() {
			_.each(this.views, function(view) {
				view.remove();
			});
			
			this.views = [];
		}
	});

	var CollectionListView = Backbone.View.extend({
		el: $("#collections")[0],
		initialize: function() {
			_.bindAll(this, 'render', 'onClick');
			$(this.el).children(".label").click(this.onClick);
			$(this.el).prev().click(this.onClick);
		},
		onClick: function(evt) {
			
			var selectedCollection = $(evt.currentTarget).html();
			selectedCollection = selectedCollection.replace("-", "");
			selectedCollection = selectedCollection.trim();

			$(this.el).prev().removeClass("selected");
			$(this.el).children("ul").children("li").removeClass("selected");
			$(this.el).children(".label").removeClass("selected");
			$(evt.currentTarget).addClass("selected");
			
			$(".paperHeader .label").html("Viewing <b>" + selectedCollection + "</b>");
			
			if (selectedCollection == "All")
			{
				$.getJSON("http://localhost:8080/urlAccess/?grouped=1", function(data) {
					
					var kbColl = new KBCollectionCollection(data);
					
					gridLayout.clear();

					kbColl.each(function(collection) {
						if (collection.get("name") != "")
							gridLayout.addView(new PageCollectionView({model: collection, paper: appView.paper}));
						else
						{
							_.each(collection.get("pages"), function(page) {
								gridLayout.addView(new PageView({model: page, paper: appView.paper}));
							});
						}
					});

					gridLayout.render(false);
				});
			}
			else if (selectedCollection == "Collections")
			{
				$.getJSON("http://localhost:8080/urlAccess/?grouped=1&onlyCollections=1", function(data) {
					
					var kbColl = new KBCollectionCollection(data);
					
					gridLayout.clear();

					kbColl.each(function(collection) {
						gridLayout.addView(new PageCollectionView({model: collection, paper: appView.paper}));
					});

					gridLayout.render(false);
				});
			}
			else
			{
				$.getJSON("http://localhost:8080/urlAccess/" + selectedCollection + "?grouped=1", function(data) {
					console.log(data);
					var kbColl = new KBCollectionCollection(data);
				
					gridLayout.clear();
				
					kbColl.each(function(collection) {
						_.each(collection.get("pages"), function(page) {
							gridLayout.addView(new PageView({model: page, paper: appView.paper}));
						});
					});
				
					gridLayout.render(false);
				});
			}
		},
		render: function() {
			var self = this;
			this.collection.each(function(coll) {
				if (coll.get("name") != "")
				{
					$(self.el).children("ul").append("<li>" + " - " + coll.get("name") + "</li>");
				}
			});
			
			$(this.el).children("ul").children("li").click(this.onClick);
		}
	});

	var TagListView = CollectionListView.extend({
		el: $("#tags")[0],
		onClick: function(evt) {
			console.log("tag click!");
		}
	});

	var AppView = Backbone.View.extend({
		el: $("#container")[0],
		
		initialize: function() {
			_.bindAll(this, 'render');
			this.paper = Raphael(this.$("#paper")[0], SCREEN_WIDTH, 7680);
			this.render();
		},
		render: function() {
			// this.paper.rect(0, 0, SCREEN_WIDTH, 7680);
			return this;
		}
	});
	
	$.getJSON("http://localhost:8080/urlAccess/?grouped=1", function(data) {
		// alert(window.innerHeight);
		$("#paperContainer").height(window.innerHeight - 100);
		appView = new AppView();
		gridLayout = new GridLayoutView();
		
		console.log(data);
		var kbColl = new KBCollectionCollection(data);
		console.log(kbColl);
		
		var collectionList = new CollectionListView({collection:kbColl});
		collectionList.render();
		
		// kbColl.models[0].set({"collapsed": true});
		kbColl.each(function(collection) {
			if (collection.get("name") != "")
				gridLayout.addView(new PageCollectionView({model: collection, paper: appView.paper}));
			else
			{
				_.each(collection.get("pages"), function(page) {
					gridLayout.addView(new PageView({model: page, paper: appView.paper}));
				});
			}
		});
		
		gridLayout.render(false);
	});
	

	
	// $.getJSON("http://localhost:8080/urlAccess/", function(data) {
	// 	var appView = new AppView();
	// 	
	// 	// console.log(data);
	// 	var page = new KBPage(data[0]);
	// 	console.log(page);
	// 	var pageColl = new KBPageCollection(data);
	// 	console.log(pageColl);
	// 	// var pgView = new PageView({model: page, x: 200, y: 400, paper: appView.paper});
	// 	var collView = new PageCollectionView({collection: pageColl, paper: appView.paper});
	// });
	
	
});
