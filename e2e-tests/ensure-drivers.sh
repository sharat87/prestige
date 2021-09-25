#!/bin/bash

set -o errexit
set -o nounset
set -o pipefail
set -o xtrace

cd "$(dirname "$0")"

os="$(uname -s)"
if [[ $os == Darwin ]]; then
	chrome_exec="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
else
	chrome_exec="google-chrome --version"
fi

chrome_version="$("$chrome_exec" --version | grep -o -m1 '[[:digit:]]\+' | head -1)"

if [[ -f drivers/chromedriver ]]; then
	driver_version="$(drivers/chromedriver --version | grep -o -m1 '[[:digit:]]\+' | head -1)"
else
	driver_version=0
fi

if [[ $driver_version == "$chrome_version" ]]; then
	echo "Already have a driver matching chrome version, $chrome_version."
	exit
fi

latest_version="$(curl --silent --location --fail --retry 3 "http://chromedriver.storage.googleapis.com/LATEST_RELEASE_$chrome_version")"

if [[ $os == Darwin ]]; then
	os_in_file=mac64
else
	os_in_file=linux64
fi

wget -c -nc --retry-connrefused --tries=0 \
	-O chromedriver.zip \
	"https://chromedriver.storage.googleapis.com/$latest_version/chromedriver_$os_in_file.zip"

unzip -o -q chromedriver.zip
mkdir -vp drivers
mv -v chromedriver drivers
rm -v chromedriver.zip
