
all: compile_typescript bundle

bundle:
	browserify js/main.js -o ./main.js

# JS_FILES = $(wildcard js/*.ts)

compile_typescript:
	cd js && tsc --allowJs ./*.ts