import web
import json
import datetime
import subprocess
import re
from pymongo import Connection
from pymongo.objectid import ObjectId

# import model

web.config.debug = True

urls = (
	'/',					'Index',
	'/url',					'URL',
	'/urlAccess',			'URLAccess',
)

app = web.application(urls, globals())
session = web.session.Session(app, web.session.DiskStore('sessions'), initializer={})

# db = web.database(dbn='sqlite', db='../db/knowledgebox')

# render = web.template.render('templates/', base='base', globals={'session': session, 'str': str})

excludedURLs = [
	re.compile('http://www.google.com/url\?.*'),
]

class MongoDB:
	def __init__(self):
		self.connection = Connection('localhost', 27017)
		self.db = self.connection.knowledgebox
		self.urls = self.db.urls
		self.accesses = self.db.accesses
		
	def insertURLAccess(self, pageURL, collectionName, tags):
		urlDoc = self.urls.find_one({"url": pageURL})
		access = {
				'access_date': datetime.datetime.now(),
				'collection': collectionName,
				'content': '',
				'highlights': {},
				'snapshot': '',
				'tags': tags,
				'time_spent': 0
		}
		
		if urlDoc is None:
			urlDoc = {
				"url": pageURL,
				"favicon": "",
				"last_access": datetime.datetime.now(),
				"score": 0,
				"times_accessed": 1
			}
			self.urls.save(urlDoc)
			access["url_id"] = urlDoc["_id"]
			self.accesses.save(access)
			
		else:
			urlDoc["times_accessed"] += 1
			
			self.urls.save(urlDoc)
			access["url_id"] = urlDoc["_id"]
			self.accesses.save(access)
	
	def updateTimeSpent(pageURL, accessId, incTime):
		urlDoc = self.urls.find_one({"url": pageURL})
		access = self.accesses.find_one({"url_id": urlDoc._id, "_id": accessId})
		access['time_spent'] += incTime
		self.accesses.save(access)
			


db = MongoDB()


class Index:
	def GET(self):
		return "hello world!"
		
class URL:
	def GET(self):
		return json.dumps(list(model.getURLs()))
	
	def POST(self):
		postData = web.input()
		pageUrl = postData["url"]
		pageTitle = postData["title"]
		collectionName = postData["collection"]
		tags = postData["tags"]
		
		for regEx in excludedURLs:
			print regEx
			if regEx.match(pageUrl, re.I):
				return

		db.insertURLAccess(pageUrl, collectionName, tags)
		
		# subprocess.Popen(["python", "pageDownloader.py", pageUrl, pageTitle], cwd="pageDownloader")

		

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
	# compile regular expressions
		
	app.run()
