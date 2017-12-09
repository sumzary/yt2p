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

local function rmdir(dir)
	os.execute(format(WIN and 'rmdir /q /s %q' or 'rm -rf %q', dir))
end

local function unclient(dir)
	rmdir(dir)
	print(format('- %s%s', dir, SEP))
end

if WIN then
	local function unreg(reg)
		os.execute(format('reg delete "%s\\%s" /f', reg, cfg.name))
		print(format('- %s', reg))
	end
	unreg('HKCU\\Software\\Mozilla\\NativeMessagingHosts')
	unreg('HKCU\\Software\\Google\\Chrome\\NativeMessagingHosts')
	unclient(format('%s\\%s', os.getenv'ProgramFiles', cfg.neatname))
else
	local function unnmh(dir)
		local path = format('%s/%s.json', dir, cfg.name)
		os.execute(format('rm -f %q', path))
		print(format('- %s', path))
	end
	local root = capture'id -un' == 'root'
	local home = os.getenv'HOME'
	if OSX then
		if root then
			unnmh('/Library/Mozilla/NativeMessagingHosts')
			unnmh('/Library/Vivaldi/NativeMessagingHosts')
			unnmh('/Library/Chromium/NativeMessagingHosts')
			unnmh('/Library/Google/Chrome/NativeMessagingHosts')
		else
			unnmh(home..'/Library/Application Support/Mozilla/NativeMessagingHosts')
			unnmh(home..'/Library/Application Support/Vivaldi/NativeMessagingHosts')
			unnmh(home..'/Library/Application Support/Chromium/NativeMessagingHosts')
			unnmh(home..'/Library/Application Support/Google/Chrome/NativeMessagingHosts')
		end
		unclient(format('%s/Library/Application Support/Mozilla/%s', home, cfg.neatname))
	else
		if root then
			unnmh('/usr/lib/mozilla/native-messaging-hosts')
			unnmh('/etc/vivaldi/native-messaging-hosts')
			unnmh('/etc/chromium/native-messaging-hosts')
			unnmh('/etc/opt/chrome/native-messaging-hosts')
		else
			unnmh(home..'/.mozilla/native-messaging-hosts')
			unnmh(home..'/.config/vivaldi/NativeMessagingHosts')
			unnmh(home..'/.config/chromium/NativeMessagingHosts')
			unnmh(home..'/.config/google-chrome/NativeMessagingHosts')
		end
		unclient(format('%s/.local/lib/%s', home, cfg.name))
	end
end

if ... ~= '-y' then
	io.write'Done! Press enter to close...'
	io.read()
end
