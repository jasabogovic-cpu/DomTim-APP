#!/bin/sh
set -e
OUT=${1:-dist}
mkdir -p $OUT
V=$(date +%s)
npx esbuild src/app.jsx --bundle --minify --format=iife --jsx=automatic --target=es2020 --outfile=$OUT/app.js --log-level=warning
cp src/style.css $OUT/app.css
sed "s/__V__/$V/g" src/index.html > $OUT/index.html
sed "s/__V__/$V/g" src/sw.js > $OUT/sw.js
cp src/manifest.webmanifest $OUT/
mkdir -p $OUT/ikone && cp src/ikone/*.png $OUT/ikone/
