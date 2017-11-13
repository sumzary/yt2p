#!/bin/sh

cd "$(dirname "$0")/data"
"./luajit" "$(basename "$0" .sh).lua" "$@"
