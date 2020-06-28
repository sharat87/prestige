serve: clean
	npx parcel serve --port 3040 --no-autoinstall --global Prestige src/index.html

build: clean
	npx parcel build --no-autoinstall --no-source-maps src/index.html

clean:
	rm -rf dist/*

.PHONY: serve
