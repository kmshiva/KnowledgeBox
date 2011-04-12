setInterval(function(){
	chrome.tabs.getCurrent(function(tab){
		console.log("1 second in " + tab.url);
	});
}, 1000);