local cfg = require'manifestconfig'
local WIN = jit.os == 'Windows'
local OSX = jit.os == 'OSX'
local SEP = WIN and '\\' or '/'
local format, gsub = string.format, string.gsub

local function capture(cmd)
	local f = io.popen(cmd)
	local s = f:read'*a'
	f:close()
	return gsub(gsub(gsub(s, '^%s+', ''), '%s+$', ''), '[\n\r]+', ' ')
end

local function mkdir(dir)
	os.execute(format(WIN and 'mkdir %q' or 'mkdir -p %q', dir))
end

local function cpdir(dir, dest)
	os.execute(format(WIN and 'xcopy /s /e /y %q %q' or 'cp -R %q %q', dir, dest))
end

local NMHJSON = [[{
	"name": %q,
	"description": %q,
	"path": %q,
	"type": "stdio",
	%q: [%q]
}
]]
local function donmh(dir, ncdir, browser)
	mkdir(dir)
	local json = format(NMHJSON,
		cfg.name, cfg.description,
		format('%s%s%s', ncdir, SEP, WIN and 'host.bat' or 'host.sh'),
		(browser == 'firefox') and 'allowed_extensions' or 'allowed_origins',
		(browser == 'firefox') and cfg.firefoxaddonid or cfg.chromeextensionid)
	local path = format('%s%s%s%s.json', dir, SEP, cfg.name, WIN and format('_%s', browser) or '')
	local fp = assert(io.open(path, 'w+'))
	assert(fp:write(json))
	fp:close()
	if not WIN then
		os.execute(format('chmod o+r %q', path))
	end
	print(format('+ %s', path))
	return path
end

local LAUNCHER_BATCH = [[
@echo off
setlocal
cd "%~dp0data"
call luajit "%~n0.lua" %*
]]
local LAUNCHER_SHELL = [[
#!/bin/sh

cd "$(dirname "$0")/data"
"./luajit" "$(basename "$0" .sh).lua" "$@"
]]
local function dolaunchers(name, dir)
	dir = dir or '..'
	local path = dir..SEP..name
	local f
	f = io.open(path..'.bat', 'w+b')
	f:write(LAUNCHER_BATCH)
	f:close()
	f = io.open(path..'.sh', 'w+b')
	f:write(LAUNCHER_SHELL)
	f:close()
	if not WIN then
		os.execute(format('chmod +x %q', path..'.sh'))
	end
end

local function doclient(dir)
	local datadir = dir..SEP..'data'
	mkdir(dir)
	mkdir(datadir)
	cpdir('.', datadir)
	dolaunchers('host', dir)
	dolaunchers('uninstall', dir)
	print(format('+ %s%s', dir, SEP))
	print(format('+ %s%s', datadir, SEP))
end

if WIN then
	local function doreg(reg, dir)
		os.execute(format('reg add "%s" /ve /t REG_SZ /d "%s" /f', reg, dir))
		print(format('+ %s', reg))
	end
	local dir = format('%s\\%s', os.getenv'ProgramFiles', cfg.neatname)
	doclient(dir)
	local ffpath = donmh(dir, dir, 'firefox')
	local gcpath = donmh(dir, dir, 'chrome')
	doreg(format('HKCU\\Software\\Mozilla\\NativeMessagingHosts\\%s', cfg.name), ffpath)
	doreg(format('HKCU\\Software\\Google\\Chrome\\NativeMessagingHosts\\%s', cfg.name), gcpath)
else
	local root = capture'id -un' == 'root'
	local home = os.getenv'HOME'
	if OSX then
		local dir = format('%s/Library/Application Support/Mozilla/%s', home, cfg.neatname)
		doclient(dir)
		if root then
			donmh('/Library/Mozilla/NativeMessagingHosts', dir, 'firefox')
			donmh('/Library/Vivaldi/NativeMessagingHosts', dir)
			donmh('/Library/Chromium/NativeMessagingHosts', dir)
			donmh('/Library/Google/Chrome/NativeMessagingHosts', dir)
		else
			donmh(home..'/Library/Application Support/Mozilla/NativeMessagingHosts', dir, 'firefox')
			donmh(home..'/Library/Application Support/Vivaldi/NativeMessagingHosts', dir)
			donmh(home..'/Library/Application Support/Chromium/NativeMessagingHosts', dir)
			donmh(home..'/Library/Application Support/Google/Chrome/NativeMessagingHosts', dir)
		end
	else
		local dir = format('%s/.local/lib/%s', home, cfg.name)
		doclient(dir)
		if root then
			donmh('/usr/lib/mozilla/native-messaging-hosts', dir, 'firefox')
			donmh('/etc/vivaldi/native-messaging-hosts', dir)
			donmh('/etc/chromium/native-messaging-hosts', dir)
			donmh('/etc/opt/chrome/native-messaging-hosts', dir)
		else
			donmh(home..'/.mozilla/native-messaging-hosts', dir, 'firefox')
			donmh(home..'/.config/vivaldi/NativeMessagingHosts', dir)
			donmh(home..'/.config/chromium/NativeMessagingHosts', dir)
			donmh(home..'/.config/google-chrome/NativeMessagingHosts', dir)
		end
	end
end

dolaunchers('uninstall')

if ... ~= '-y' then
	io.write'Done! Press enter to close...'
	io.read()
end
