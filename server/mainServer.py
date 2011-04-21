import web
import json
import datetime
import subprocess
import re
import pymongo
from pymongo import Connection
from pymongo.objectid import ObjectId
import base64
import uuid
import urlparse
import os.path
import Image

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
	'http://www.google.com/url',
	'http://localhost:8080/',
	'http://pinboard.in/',
	'http://reddit.com/',
	'http://www.google.com/search',
]

class ComplexEncoder(json.JSONEncoder):
	def default(self, obj):
		if isinstance(obj, ObjectId):
			return str(obj)
		elif isinstance(obj, datetime.datetime):
			return obj.isoformat()
		else:
			return json.JSONEncoder.default(self, obj)

class MongoDB:
	def __init__(self):
		self.connection = Connection('localhost', 27017)
		self.db = self.connection.knowledgebox
		self.urls = self.db.urls
		self.accesses = self.db.accesses
		self.collections = self.db.collections
		
	def insertURLAccess(self, pageURL, pageTitle, collectionName, tags):
		urlDoc = self.urls.find_one({"url": pageURL})
		accessDoc = {
				'access_date': datetime.datetime.now(),
				'collection': collectionName,
				'content': '',
				'highlights': {},
				'snapshot': '',
				'tags': [],
				'time_spent': 0,
				'page_title': pageTitle,
				'url': pageURL,
				'starred': False
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
		
	def getURLAccesses(self):
		return self.accesses.find({})
		
	def getURLAccessGrouped(self, collectionName, onlyCollections):
		collections = []
		if len(collectionName) == 0:
			for col in db.collections.find():
				col["pages"] = list(db.accesses.find({"collection": col["name"]}).sort([("starred", pymongo.DESCENDING), ("time_spent", pymongo.DESCENDING), ("access_date", pymongo.DESCENDING)]))
				collections.append(col)
			if not onlyCollections:
				col = {"name": ""};
				col["pages"] = list(db.accesses.find({"collection": ""}).limit(500).sort([("starred", pymongo.DESCENDING), ("time_spent", pymongo.DESCENDING), ("access_date", pymongo.DESCENDING)]))
				collections.append(col)
		else:
			col = {"name": collectionName};
			col["pages"] = list(db.accesses.find({"collection": collectionName}).limit(500).sort([("starred", pymongo.DESCENDING), ("time_spent", pymongo.DESCENDING), ("access_date", pymongo.DESCENDING)]))
			collections.append(col)
			
		return collections
		
	def saveSnapshotURL(self, accessId, snapshotURL, snapshotThumbURL):
		print accessId, snapshotURL
		db.accesses.update({"_id": ObjectId(accessId)}, {"$set": {"snapshot": snapshotURL, "snapshotThumb": snapshotThumbURL}})
	
	def savePageText(self, accessId, pageText):
		db.accesses.update({"_id": ObjectId(accessId)}, {"$set": {"text": pageText}})
		
	def getAllTags(self):
		return db.tags.find()

db = MongoDB()

def isExcludedURL(url):
	for excURL in excludedURLs:
		if url.startswith(excURL):
			return True
	
	return False


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
		
		if isExcludedURL(pageUrl):
			return
		
		urlDoc, accessDoc = db.insertURLAccess(pageUrl, pageTitle, collectionName, tags)
		
		# subprocess.Popen(["sleep", "10"])
		# subprocess.Popen(["python", "pageDownloader.py", pageUrl, pageTitle], cwd="pageDownloader")
		
		return str(accessDoc["_id"])


class URLAccess:
	def GET(self, collectionName):
		input_data = web.input()
		if input_data.has_key("grouped"):
			if input_data.has_key("onlyCollections"):
				return json.dumps(list(db.getURLAccessGrouped(collectionName, True)), cls=ComplexEncoder)
			else:
				return json.dumps(list(db.getURLAccessGrouped(collectionName, False)), cls=ComplexEncoder)
		else:
			return json.dumps(list(db.getURLAccesses()), cls=ComplexEncoder)
		
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
		elif type == "snapshot":
			if isExcludedURL(input_data["url"]):
				return
			self.saveSnapshot(input_data["url"], input_data["title"], input_data["accessId"], input_data["snapshot"])
		elif type == "pageText":
			db.savePageText(input_data["accessId"], input_data["text"])
		
		# if input_data.action == "insert":
		# 			urlAccessId = model.insertURLAccess(input_data.url, datetime.datetime.now())
		# 			return json.dumps({"urlAccessId": urlAccessId})
		# 		elif input_data.action == "addTime":
		# 			urlAccessId = model.addSpentTimeForURLAccess(input_data.urlAccessId, input_data.timeSpent)
		# 			return json.dumps({"urlAccessId": urlAccessId})
	def sanitizePath(self, path):
		invalidChars = ['>', '<', ':', '"', '\\', '/', '|', '?','*', '-']
		for invalidChar in invalidChars:
			path = path.replace(invalidChar, "_")
		
		return path
	
	def saveSnapshot(self, url, title, accessId, data):
		dateDir = datetime.datetime.today().strftime("%d %b %Y").strip()
		hostDir = urlparse.urlparse(url).hostname
		pageTitleDir = self.sanitizePath(title) + "_" + str(uuid.uuid4())
		
		outputDir = os.path.join("static", "savedPages", dateDir, hostDir, pageTitleDir, "snapshot")
		
		if not os.path.exists(outputDir):
			os.makedirs(outputDir)
		
		fd = open(os.path.join(outputDir, "snapshot.png"), "wb")
		fd.write(base64.b64decode(data[22:]))
		fd.close()
		
		img = Image.open(os.path.join(outputDir, "snapshot.png"))
		img = img.resize((260, 200), Image.ANTIALIAS)
		img.save(os.path.join(outputDir, "snapshot_thumb.png"))
		
		db.saveSnapshotURL(accessId, "http://localhost:8080/" + os.path.join(outputDir, "snapshot.png"), "http://localhost:8080/" + os.path.join(outputDir, "snapshot_thumb.png"))
		
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
			if inp.has_key("url"):
				print "return tags for url", inp["url"]
			else:
				return json.dumps(list(db.getAllTags()))

if __name__ == "__main__":
	# app.internalerror = web.debugerror
	# compile regular expressions
		
	app.run()
