import web
import json
import datetime

import model

web.config.debug = True

urls = (
	'/',					'Index',
	'/url',					'URL',
	'/urlAccess',			'URLAccess',
	)

app = web.application(urls, globals())
session = web.session.Session(app, web.session.DiskStore('sessions'), initializer={})

db = web.database(dbn='sqlite', db='../db/knowledgebox')

# render = web.template.render('templates/', base='base', globals={'session': session, 'str': str})

class Index:
	def GET(self):
		return "hello world!"
		
class URL:
	def GET(self):
		return json.dumps(list(model.getURLs()))
	
	def POST(self):
		pass

class URLAccess:
	def GET(self):
		return list(model.getURLAccesses())
		
	def POST(self):
		input_data = web.input()
		print input_data
		if input_data.action == "insert":
			urlAccessId = model.insertURLAccess(input_data.url, datetime.datetime.now())
			return json.dumps({"urlAccessId": urlAccessId})
		elif input_data.action == "addTime":
			urlAccessId = model.addSpentTimeForURLAccess(input_data.urlAccessId, input_data.timeSpent)
			return json.dumps({"urlAccessId": urlAccessId})

if __name__ == "__main__":
	# app.internalerror = web.debugerror
	app.run()
