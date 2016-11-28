dist: *.js
	mkdir -p dist
	yui-compressor -o dist/moo-websocket-client.min.js moo-websocket-client.js
	yui-compressor -o dist/moo-websocket-client-editor.min.js moo-websocket-client-editor.js
clean: ./dist
	rm -fr dist

