#!/bin/bash

rm -fr lib/
npm run build.prod

npm publish
