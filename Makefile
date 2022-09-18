.PHONY: update build_production

# obtain the absolute path to the makefile dir
MAKEFILE_DIR := $(dir $(lastword $(MAKEFILE_LIST)))
BASE_DIR := $(realpath $(MAKEFILE_DIR))

node_modules:
	npm install

update:
	git pull
	cd submods/p2fa-vislab; git pull

build_production:
	npm run build
