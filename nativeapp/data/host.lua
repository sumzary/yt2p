local host = {}

local ffi = require'ffi'
local json = require'json'

local format = string.format

local WIN = jit.os == 'Windows'
local SEP = WIN and '\\' or '/'

function host.ping()
	return 3 -- nativeapp version
end

function host.execute(msg)
	if not msg.command then return nil, 'command is nil' end
	if msg.command == "" then return nil, 'command is empty' end
	if WIN and msg.clipboard then require'winapi'.setclipboard(msg.clipboard) end
	local tmppath = os.tmpname()
	if WIN then tmppath = os.getenv'TMP':gsub('[\\/]+$', SEP)..tmppath end
	local f = io.open(tmppath, 'w+')
	f:write(format('os.execute[[%s]]', msg.command))
	f:close()
	local fmt = WIN and 'start "" /b /d . luajit %q 2>&1' or './luajit %q 2>&1'
	f = io.popen(format(fmt, tmppath))
	local s = f:read'*a'
	f:close()
	os.remove(tmppath)
	if not s then return end
	return { type='output', message=s:gsub('^%s+', ''):gsub('%s+$', '') }
end

function host.canbrowse(_)
	return pcall(require, 'dialog')
end

function host.browseexe(msg)
	return require'dialog'.open{
		dir = '<applications>',
		title = msg.title,
		filters = { '<all>', '<application>' }
	}
end

function host.browseicon(msg)
	msg.path = require'dialog'.open{
		dir = '<icons>',
		title = msg.title,
		filters = {'<all>', '<icon>'}
	}
	return host.pathicon(msg)
end

function host.pathicon(msg)
	local extmimetypes = {
		bmp = 'image/bmp',
		gif = 'image/gif',
		png = 'image/png',
		apng = 'image/png',
		jpg = 'image/jpeg',
		jpeg = 'image/jpeg',
		ico = 'image/x-icon',
		svg = 'image/svg+xml',
	}
	local path = msg.path
	if path == false then return false end
	if not path then return end
	local ext = path:match'([^%.]+)$'
	local mime = extmimetypes[ext]
	local remove = false
	if not mime then
		if jit.os ~= 'Windows' then return end
		local tmppath = os.getenv'TMP'..SEP..'tmpicon.ico'
		path = require'winapi'.savefileicon(path, tmppath, msg.large)
		if not path then return end
		mime = extmimetypes.ico
		remove = true
	end
	local fp = io.open(path, 'rb')
	if not fp then return end
	local data = fp:read'*a'
	if remove then os.remove(path) end
	if not data then return end
	local b64 = require'base64'.encode(data)
	return string.format('data:%s;base64,%s', mime, b64)
end

local function contains(t, v)
	for i=1, #t do if t[i]==v then return true end end; return false
end
function host.exeautocomplete(msg)
	local fs = require'fs'
	local function isexe(path)
		if WIN then
			local x = path:match'%.([^.]+)$'
			if x=='exe' or x=='com' or x=='bat' or x=='cmd' then return true end
		else
			local permissions = fs.attr(path, 'permissions')
			if permissions and permissions:find'x' then return true end
		end
		return false
	end
	if not msg.path or not msg.path:find'[\\/:]' then
		local PATH = os.getenv'PATH'
		if not PATH then return end
		local PATHSEP = WIN and ';' or ':'
		local exes = {}
		for dir in PATH:gmatch('[^'..PATHSEP..']+') do
			if fs.attr(dir, 'mode') == 'directory' then
				for name in fs.dir(dir) do
					local path = dir:find'[\\/]$' and dir..name or dir..SEP..name
					local mode = fs.attr(path, 'mode')
					if mode == 'file'and not contains(exes, name) and isexe(path) then
						table.insert(exes, name)
					end
				end
			end
		end
		table.sort(exes)
		return exes
	end
	local dir = msg.path:gsub('(.*[\\/].+)[\\/]$', '%1')
	if fs.attr(dir, 'mode') ~= 'directory' then return end
	local dirs = {}
	local exes = {}
	for name in fs.dir(dir) do
		local path = dir:find'[\\/]$' and dir..name or dir..SEP..name
		local mode = fs.attr(path, 'mode')
		if mode == 'directory' and name ~= '.' and name ~= '..' then
			table.insert(dirs, path..SEP)
		elseif mode == 'file' and isexe(path) then
			table.insert(exes, path)
		end
	end
	table.sort(dirs)
	table.sort(exes)
	local res = {}
	for _, v in ipairs(dirs) do table.insert(res, v) end
	for _, v in ipairs(exes) do table.insert(res, v) end
	return res
end

if ... == 'test' then
	local function test(msg)
		local res, err = host[msg.type](msg)
		if type(res) == 'table' then
			for i = 1, #res do print(res[i]) end
		else
			print(res, err)
		end
		io.write'Press enter to continue...'
		io.read()
	end
	test{ type='ping' }
	test{ type='execute' }
	test{ type='execute', command='' }
	if WIN then
		test{ type='execute', command='C:\\' }
		test{ type='execute', command='H:/black-shades.exe' }
		test{ type='execute', command='"C:\\Program Files/Internet Explorer\\iexplore.exe"' }
		test{ type='exeautocomplete' }
		test{ type='exeautocomplete', path='' }
		test{ type='exeautocomplete', path='C:/' }
		test{ type='exeautocomplete', path='C:\\Windows' }
		test{ type='exeautocomplete', path='C:/Program Files\\' }
	else
		test{ type='execute', command='/' }
		test{ type='execute', command='gnome-terminal' }
		test{ type='execute', command='/usr!"£$_)+(^&*£$(&+_}}~¨' }
		test{ type='exeautocomplete' }
		test{ type='exeautocomplete', path='' }
		test{ type='exeautocomplete', path='/' }
		test{ type='exeautocomplete', path='/usr/' }
		test{ type='exeautocomplete', path='/usr/bin' }
	end
	test{ type='browseexe' }
	test{ type='browseicon' }
	return
end

local function readsz()
	while true do
		local str = io.stdin:read(4)
		if not str then return end
		local szp = ffi.cast('uint32_t*', ffi.cast('const char*', str))
		if szp[0] < 4096 then return szp[0] end
		io.stdin:read()
	end
end
local function readmsg()
	while true do
		local sz = readsz()
		if not sz then return end
		local data = json.parse(io.read(sz))
		if type(data) == 'table' then return data end
	end
end
local function sendmsg(msg)
	if not msg then return end
	local str = json.stringify(msg)
	local szp = ffi.new('uint32_t[1]', string.len(str))
	io.stdout:write(ffi.string(szp, 4)..str)
	io.stdout:flush()
end

repeat
	local msg = readmsg()
	if not msg then return end
	local fun = host[msg.type]
	if fun then
		local ok, res, err = pcall(fun, msg)
		if not ok or res == nil then
			sendmsg{ type = 'error', message = err or res or 'failure' }
		else
			sendmsg(res)
		end
	end
until not msg.port

return host
