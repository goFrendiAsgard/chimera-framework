import sys, json

# get request and config from the framework
req = json.loads(sys.argv[1])
config = json.loads(sys.argv[2])
params = req['params']

# create response
title = 'sample.responder.py'
name = 'Kimi no na wa?'
if 'name' in params:
    name = params['name']
response = {'title': title, 'name': name}

# show time
print (json.dumps(response))

