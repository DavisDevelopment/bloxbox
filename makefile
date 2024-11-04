
min: compile_typescript web_bundle_min uglify_optimize

all: compile_typescript web_bundle uglify_optimize

web_notugly: compile_typescript web_bundle
	mv main.bundled.js ./main.js

uglify_optimize:
	uglifyjs --compress --mangle --beautify --comments all -- main.bundled.js > main.js

web_bundle:
	browserify js/main.js -o ./main.bundled.js

web_bundle_min:
	browserify js_min/main.js -o ./main.bundled.js

uglify_all:
	bash ./optjs.sh

# JS_FILES = $(wildcard js/*.ts)

compile_typescript:
	cd js && tsc --allowJs ./*.ts