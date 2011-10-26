# Start at a Makefile or managing build activities.
# Expects a 'cook' script somewhere on the $PATH.
# See 'cook' in this directory for a sample you can use.
# For now users the OSX specific "open" to run a test file. This
# will need to change.
#

clean:
	rm cooked/*.html || true
	rm cooked/*.jar || true
	rm cooked/*.js || true
	rmdir cooked || true
	rm js/tiddlywebwiki || true

test: clean tests.html
	ln -sf test/recipes/sample.txt .
	open cooked/tests.html

tests.html:
	mkdir -p cooked
	cook $(PWD)/test/recipes/tests.html.recipe -d $(PWD)/cooked -o tests.html

alpha:
	./bldalpha

twebwiki_remotes:
	mkdir js/tiddlywebwiki || true
	wget https://raw.github.com/jdlrobson/tiddlywebwikiclient/tiddlywebwikibuild/ServerSideSavingPlugin.js \
		-O js/tiddlywebwiki/ServerSideSavingPlugin.js
	wget https://raw.github.com/jdlrobson/tiddlywebwikiclient/tiddlywebwikibuild/TiddlyWebAdaptor.js \
		-O js/tiddlywebwiki/TiddlyWebAdaptor.js
	wget https://raw.github.com/jdlrobson/tiddlywebwikiclient/tiddlywebwikibuild/TiddlyWebConfig.js \
		-O js/tiddlywebwiki/TiddlyWebConfig.js

twebwiki: twebwiki_remotes
	./bldtwebwiki

release: clean twebwiki
	mkdir twebwiki-release || true
	rm -rf twebwiki-release/latest || true
	cp -r cooked twebwiki-release/latest
