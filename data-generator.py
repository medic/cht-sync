import urllib.request
import random
import os
import time
import json
import base64
import time
import glob

credentials = ('%s:%s' % (os.getenv("COUCHDB_USER"), os.getenv("COUCHDB_PASSWORD")))
encoded_credentials = base64.b64encode(credentials.encode('ascii')).decode("ascii")

for doc_path in glob.glob(os.getenv("DOCS_PATH")+"/*.json"):
    with open(doc_path, "rb") as doc_file:
        doc = json.loads(doc_file.read())

        req = urllib.request.Request(
            os.path.join(os.getenv("URL"), doc["_id"]),
            data=json.dumps(doc).encode("utf-8"),
            method='PUT'
        )

    req.add_header('Authorization', 'Basic %s' % encoded_credentials)

    try:
        res = urllib.request.urlopen(req)
        print(doc_path, res.info())
    except Exception as e:
        print(e)
    time.sleep(2)
