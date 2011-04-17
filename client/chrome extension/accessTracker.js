
chrome.extension.onRequest.addListener(function(req, sender, sendResponse) {
	if (req["type"] == "get_accessId")
	{
		var inp = document.getElementById("accessId");
		if (inp != null)
		{
			var accessID = inp.getAttribute("value");
			sendResponse(accessID);
		}
		else
			sendResponse(null);
	}
	else if (req["type"] == "save_accessId")
	{
		var inp = document.createElement('input');
		inp.setAttribute('id', 'accessId');
		inp.setAttribute('type', 'hidden');
		inp.setAttribute('value', req["accessId"]);
		document.body.appendChild(inp);
	}
});