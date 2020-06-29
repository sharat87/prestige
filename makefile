serve: clean
	npx parcel serve --port 3040 --no-autoinstall --global Prestige src/index.pug

build: clean
	npx parcel build --no-autoinstall --no-source-maps src/index.html

clean:
	rm -rf .cache dist/*

.PHONY: serve
