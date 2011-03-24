import web

db = web.database(dbn='sqlite', db='../db/knowledgebox')

updateTimeSpentQuery = """update URLAccess set time_spent = time_spent + $time_spent where id=$id"""

def getURLs():
	return db.select('URL')
	
def getURLAccesses():
	return db.select('URLAccess')

def insertURLAccess(url, accessDate):
	return db.insert("URLAccess", url=url, access_datetime=accessDate, time_spent=0)
	
def addSpentTimeForURLAccess(urlAccessId, incTimeSpent):
	return db.query(updateTimeSpentQuery, {"time_spent": incTimeSpent, "id": urlAccessId})