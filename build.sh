#!/bin/sh
set -e
OUT=${1:-dist}
mkdir -p $OUT
V=$(date +%s)
npx esbuild src/app.jsx --bundle --minify --format=iife --jsx=automatic --target=es2020 --outfile=$OUT/app.js --log-level=warning
cp src/style.css $OUT/app.css
sed "s/__V__/$V/g" src/index.html > $OUT/index.html
