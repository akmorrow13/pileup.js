#!/bin/bash
# Build require-ale and minified assets for distribution.
set -o errexit
# ./scripts/make-mini-d3.sh # TODO: remove

# Transpile individual files. This is useful if another module,
# e.g. cycledash, wants to require('pileup').
# The dist/test files are required for code coverage
mkdir -p dist/test/{data,source,viz}
babel src --retain-lines --ignore src/lib --out-dir dist
cp -r src/lib dist/

# Create dist/tests
browserify \
  -v \
  -t [ babelify --ignore src/lib ] \
  --debug \
  -o dist/tests.js \
  $(find src/test -name '*.js')
