import sys, datetime, urlparse, uuid, os, os.path, time, threading, subprocess, web, re
from BeautifulSoup import BeautifulSoup

def downloadFile(filename):
	fd = open("./links/" + filename, "r")
	url, className, groupName = fd.readlines()
	fd.close()
	
	print url, className, groupName
	
	os.mkdir("./static/cachedPages/" + filename)
	
	retval = subprocess.call(["wget", "-E","-H","-k","-K","--no-directories","--no-host-directories","-erobots=off","-p", url.strip()], cwd="./static/cachedPages/" + filename)
	# retval = subprocess.call(["wget", url.strip()], cwd="./cachedPages")
	print "Returned: " + str(retval)
	
	return [url, className, groupName, "./static/cachedPages/" + filename]

def removeTagsFromHTMLFile(htmlData):
	soup = BeautifulSoup(htmlData)
	scripts = soup.findAll("script")
	[script.extract() for script in scripts]
	return str(soup)
	

def stripJavascript(downloadDir):
	for downloadedFile in os.listdir(downloadDir):
		if downloadedFile[-2:].lower() == "js":
			print "removing file " + downloadedFile
			os.remove(os.path.join(downloadDir, downloadedFile))
		elif downloadedFile[-4:].lower() == "html" or downloadedFile[-4:].lower() == ".htm":
			fd = open(os.path.join(downloadDir, downloadedFile), "r")
			htmlData = fd.read()
			fd.close()
			
			print "stripping JS from file:" + downloadedFile
			fd = open(os.path.join(downloadDir, downloadedFile), "w")
			fd.write(removeTagsFromHTMLFile(htmlData))
			fd.close()

def findMainHTMLFile(downloadDir):
	largestFile = {"filename": "", "size": 0}
	for downloadedFile in os.listdir(downloadDir):
		if downloadedFile[-4:].lower() == "html" or downloadedFile[-4:].lower() == ".htm":
			if largestFile["size"] < os.path.getsize(os.path.join(downloadDir, downloadedFile)):
				largestFile["filename"] = downloadedFile
				largestFile["size"] = os.path.getsize(os.path.join(downloadDir, downloadedFile))
	
	return largestFile["filename"]

def getTitle(mainFile):
	fd = open(mainFile, "r")
	htmlData = fd.read()
	fd.close()
	
	soup = BeautifulSoup(htmlData)
	titleTags = soup.findAll("title", limit=1)
	if len(titleTags) > 0:
		return titleTags[0].string
		
	return None
	
def sanitizeFileName(fileName):
	return re.sub("[?&=]+", "_", fileName)
	
def fetchURL(url, pageTitle, outputDir):
	codeDir = os.path.join(outputDir, "code")
	if not os.path.exists(codeDir):
		os.makedirs(codeDir)
	retVal = subprocess.call(["wget", "-E","-H","-k","-K","--no-directories","--no-host-directories","-erobots=off","-p", url], cwd=codeDir)
	
	if retVal != 0 and retVal != 8:
		raise Exception("Fetching website HTML failed with return value: " + retVal + ".")
	# retval = subprocess.call(["wget", url.strip()], cwd="./cachedPages")
	# print "Returned: " + str(retval)
	return codeDir

def getWebsiteSnapshot(url, outputDir):
	snapshotsDir = os.path.join(outputDir, "snapshots")
	if not os.path.exists(snapshotsDir):
		os.makedirs(snapshotsDir)
		
	retVal = subprocess.call(["python", "webkit2png-0.5.py", "-D", snapshotsDir, url])
	
	if retVal != 0:
		raise Exception("Fetching website snapshots failed with return value: " + retVal + ".")
	
	return snapshotsDir

if len(sys.argv[1].strip()) > 0 or sys.argv[:4].lower() != "http":
	try:
		url = sys.argv[1].strip()
		pageTitle = sanitizeFileName(sys.argv[2].strip()[:50])
		
		dateDir = datetime.date.today().strftime("%d %b %Y").strip()

		hostDir = urlparse.urlparse(url).hostname

		pageTitleDir = pageTitle + " " + str(uuid.uuid4())

		outputDir = os.path.join("./", dateDir, hostDir, pageTitleDir)
		
		if not os.path.exists(outputDir):
			os.makedirs(outputDir)
		
		snapshotsDir = getWebsiteSnapshot(url, outputDir)
		codeDir = fetchURL(url, pageTitle, outputDir)
	
		print
		print "="*80
		print
		print "successful: ", snapshotsDir, codeDir
		mainHTMLFile = findMainHTMLFile(codeDir)
		print "main file", mainHTMLFile
		sanitizedFileName = sanitizeFileName(mainHTMLFile)
		if sanitizedFileName != mainHTMLFile:
			os.rename(os.path.join(codeDir, mainHTMLFile), os.path.join(codeDir, sanitizedFileName))
			print "renamed file:", sanitizedFileName
		print "stripping javascript...",
		stripJavascript(codeDir)
		print "done"
	
		print os.path.join(codeDir, sanitizedFileName)
		sys.exit(0)

	except Exception as ex:
		print """Ooops! An error occurred: """ + ex.message
		sys.exit(-1)
	
		
else:
	print """No arguments specified.
	
	Use like this:
	pageDownloader.py <url>
	"""

# while 1:
#   time.sleep (10)
#   after = dict ([(f, None) for f in os.listdir (path_to_watch)])
#   added = [f for f in after if not f in before]
#   removed = [f for f in before if not f in after]
#   if added: 
# 	print "Added: ", ", ".join (added)
# 	for newFile in added:
# 		fileInfo = downloadFile(newFile)
# 		stripJavascript(fileInfo[3])
# 		mainFile = findMainHTMLFile(fileInfo[3])
# 		sanitizedFileName = sanitizeFileName(mainFile)
# 		os.rename(os.path.join(fileInfo[3], mainFile), os.path.join(fileInfo[3], sanitizedFileName))
# 		mainFile = sanitizedFileName
# 		fileInfo[3] = os.path.join(fileInfo[3], mainFile)
# 		fileInfo.append(getTitle(fileInfo[3]))
# 		insertLinkIntoDB(fileInfo)
# 		
#   before = after
# 
