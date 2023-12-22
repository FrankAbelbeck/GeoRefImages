VERSION = $(shell grep -oP -e '(?<="version": ")(.+?)(?=")' manifest.json )

all:
	zip -r -FS ../GeoRefImages-$(VERSION).zip * --exclude '*.git' --exclude 'Makefile'
