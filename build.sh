#!/bin/sh

# this file creates:
#   build/yt2p-extension.xpi
#   build/yt2p-nativeapp.zip
#   build/yt2p-sources.zip

rm -fR build
mkdir -p build

cd build

# https://github.com/mozilla/webextension-polyfill/tree/0.2.1
git clone -b '0.2.1' --single-branch --depth 1 https://github.com/mozilla/webextension-polyfill.git
cd webextension-polyfill
npm install
npm run build
cd ..
cp webextension-polyfill/dist/browser-polyfill.min.js ../extension

# https://github.com/LeaVerou/awesomplete/tree/v1.1.2
git clone -b 'v1.1.2' --single-branch --depth 1 https://github.com/LeaVerou/awesomplete.git
cp awesomplete/awesomplete.css ../extension
cp awesomplete/awesomplete.min.js ../extension

# https://github.com/luapower/luajit/tree/2.1.0-beta2
git clone -b '2.1.0-beta2' --single-branch --depth 1 https://github.com/luapower/luajit.git
cp luajit/bin/linux32/luajit ../nativeapp/data/linux32
cp luajit/bin/linux32/luajit-bin ../nativeapp/data/linux32
cp luajit/bin/linux64/luajit ../nativeapp/data/linux64
cp luajit/bin/linux64/luajit-bin ../nativeapp/data/linux64
cp luajit/bin/mingw32/lua51.dll ../nativeapp/data/mingw32
cp luajit/bin/mingw32/luajit.exe ../nativeapp/data/mingw32
cp luajit/bin/mingw64/lua51.dll ../nativeapp/data/mingw64
cp luajit/bin/mingw64/luajit.exe ../nativeapp/data/mingw64
cp luajit/bin/osx32/luajit ../nativeapp/data/osx32
cp luajit/bin/osx32/luajit-bin ../nativeapp/data/osx32
cp luajit/bin/osx64/luajit ../nativeapp/data/osx64
cp luajit/bin/osx64/luajit-bin ../nativeapp/data/osx64

cd ..

zip -r build/yt2p-sources.zip . -x *.git* build/\* *.sublime-workspace
cd extension
zip -r ../build/yt2p-extension.xpi .
cd ..
cd nativeapp
zip -r ../build/yt2p-nativeapp.zip .
cd ..
