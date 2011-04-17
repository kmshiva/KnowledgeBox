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
	'/url/',				'URL',
	'/urlAccess/(.*)',		'URLAccess',
	'/collection/(.*)',		'Collection',
	'/tags/(.*)',			'Tags'
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
		self.collections = self.db.collections
		
	def insertURLAccess(self, pageURL, collectionName, tags):
		urlDoc = self.urls.find_one({"url": pageURL})
		accessDoc = {
				'access_date': datetime.datetime.now(),
				'collection': "",
				'content': '',
				'highlights': {},
				'snapshot': '',
				'tags': [],
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
			accessDoc["url_id"] = urlDoc["_id"]
			self.accesses.save(accessDoc)
			
		else:
			urlDoc["times_accessed"] += 1
			
			self.urls.save(urlDoc)
			accessDoc["url_id"] = urlDoc["_id"]
			self.accesses.save(accessDoc)
			
		return urlDoc, accessDoc
	
	def addTimeSpent(self, accessId, incTime):
		print accessId
		access = self.accesses.find_one({"_id": ObjectId(accessId)})
		access['time_spent'] += int(incTime)
		self.accesses.save(access)
	
	def addToCollection(self, accessId, collectionName):
		self.accesses.update({"_id": ObjectId(accessId)}, {"$set": {"collection": collectionName}})
	
	def removeFromCollection(self, accessId):
		self.accesses.update({"_id": ObjectId(accessId)}, {"$set": {"collection": ""}})
	
	def addTag(self, accessId, tag):
		self.accesses.update({"_id": ObjectId(accessId)}, {"$addToSet": {"tags": tag}})
		
	def removeTag(self, accessId, tag):
		self.accesses.update({"_id": ObjectId(accessId)}, {"$pull": {"tags": tag}})
	
	def star(self, accessId):
		self.accesses.update({"_id": ObjectId(accessId)}, {"$set": {"starred": True}})
	
	def unstar(self, accessId):
		self.accesses.update({"_id": ObjectId(accessId)}, {"$set": {"starred": False}})
		
	def getCollections(self, collectionName):
		if collectionName:
			return self.collections.find({"name": collectionName}, {"name":1, "_id": 0})
		else:
			return self.collections.find({}, {"name":1, "_id":0})
		
	def insertCollection(self, collectionName):
		col = {"name": collectionName}
		self.collections.save(col)	

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
		
		urlDoc, accessDoc = db.insertURLAccess(pageUrl, collectionName, tags)
		
		# subprocess.Popen(["sleep", "10"])
		# subprocess.Popen(["python", "pageDownloader.py", pageUrl, pageTitle], cwd="pageDownloader")
		
		return str(accessDoc["_id"])


class URLAccess:
	def GET(self):
		return list(model.getURLAccesses())
		
	def POST(self, type):
		input_data = web.input()
		print input_data
		
		if type == "addTime":	
			db.addTimeSpent(input_data["accessID"], input_data["incTime"])
		elif type == "addToCollection":
			db.addToCollection(input_data["accessId"], input_data["collectionName"])
		elif type == "removeFromCollection":
			db.removeFromCollection(input_data["accessId"])
		elif type == "addTag":
			db.addTag(input_data["accessId"], input_data["tag"])
		elif type == "removeTag":
			db.removeTag(input_data["accessId"], input_data["tag"])
		elif type == "star":
			db.star(input_data["accessId"])
		elif type == "unstar":
			db.unstar(input_data["accessId"])
		
		# if input_data.action == "insert":
		# 			urlAccessId = model.insertURLAccess(input_data.url, datetime.datetime.now())
		# 			return json.dumps({"urlAccessId": urlAccessId})
		# 		elif input_data.action == "addTime":
		# 			urlAccessId = model.addSpentTimeForURLAccess(input_data.urlAccessId, input_data.timeSpent)
		# 			return json.dumps({"urlAccessId": urlAccessId})
		
class Collection:
	def GET(self, collectionName):
		return json.dumps(list(db.getCollections(collectionName)))
	
	def POST(self, collectionName):
		input_data = web.input()
		db.insertCollection(input_data["collectionName"])
		db.addToCollection(input_data["accessId"], input_data["collectionName"])

class Tags:
	def GET(self, tagName):
		if tagName:
			print "returning urls for tag", tagName
		else:
			inp = web.input()
			if inp["url"]:
				print "return tags or url", inp["url"]
			else:
				print "returning all tags"

if __name__ == "__main__":
	# app.internalerror = web.debugerror
	# compile regular expressions
		
	app.run()
