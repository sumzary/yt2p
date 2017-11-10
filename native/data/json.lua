local json = {}

local function kindof(obj)
	if type(obj) ~= 'table' then return type(obj) end
	local i = 1
	for _ in pairs(obj) do
		if obj[i] ~= nil then i = i + 1 else return 'table' end
	end
	if i == 1 then return 'table' else return 'array' end
end

local function escapestr(s)
	local inchar  = {'\\', '"', '/', '\b', '\f', '\n', '\r', '\t'}
	local outchar = {'\\', '"', '/',  'b',  'f',  'n',  'r',  't'}
	for i, c in ipairs(inchar) do
		s = s:gsub(c, '\\'..outchar[i])
	end
	return s
end

function json.stringify(obj, askey)
	local s = {}
	local kind = kindof(obj)
	if kind == 'array' then
		if askey then error('Can\'t encode array as key.') end
		s[#s + 1] = '['
		for i, val in ipairs(obj) do
			if i > 1 then s[#s + 1] = ', ' end
			s[#s + 1] = json.stringify(val)
		end
		s[#s + 1] = ']'
	elseif kind == 'table' then
		if askey then error('Can\'t encode table as key.') end
		s[#s + 1] = '{'
		for k, v in pairs(obj) do
			if #s > 1 then s[#s + 1] = ', ' end
			s[#s + 1] = json.stringify(k, true)
			s[#s + 1] = ':'
			s[#s + 1] = json.stringify(v)
		end
		s[#s + 1] = '}'
	elseif kind == 'string' then
		return '"'..escapestr(obj)..'"'
	elseif kind == 'number' then
		if askey then return '"'..tostring(obj)..'"' end
		return tostring(obj)
	elseif kind == 'boolean' then
		return tostring(obj)
	elseif kind == 'nil' then
		return 'null'
	else
		error('Unjsonifiable type: '..kind..'.')
	end
	return table.concat(s)
end

-- returns pos, didfind; there are two cases:
-- 1. delimiter found: pos = pos after leading space + delim; didfind = true
-- 2. delimiter not found: pos = pos after leading space;     didfind = false
-- this throws an error if errifmissing is true and the delim is not found
local function skipdelim(str, pos, delim, errifmissing)
	pos = pos + #str:match('^%s*', pos)
	if str:sub(pos, pos) ~= delim then
		if errifmissing then
			error('Expected '..delim..' near position '..pos)
		end
		return pos, false
	end
	return pos + 1, true
end

-- expects the given pos to be the first character after the opening quote
-- returns val, pos; the returned pos is after the closing quote character
local function parsestrval(str, pos, val)
	val = val or ''
	local earlyenderror = 'End of input found while parsing string.'
	if pos > #str then error(earlyenderror) end
	local c = str:sub(pos, pos)
	if c == '"'  then return val, pos + 1 end
	if c ~= '\\' then return parsestrval(str, pos + 1, val..c) end
	-- we must have a \ character
	local escmap = {b = '\b', f = '\f', n = '\n', r = '\r', t = '\t'}
	local nextc = str:sub(pos + 1, pos + 1)
	if not nextc then error(earlyenderror) end
	return parsestrval(str, pos + 2, val..(escmap[nextc] or nextc))
end

-- returns val, pos; the returned pos is after the number's final character
local function parsenumval(str, pos)
	local numstr = str:match('^-?%d+%.?%d*[eE]?[+-]?%d*', pos)
	local val = tonumber(numstr)
	if not val then error('Error parsing number at position '..pos..'.') end
	return val, pos + #numstr
end

json.null = {} -- represents null

function json.parse(str, pos, enddelim)
	pos = pos or 1
	if pos > #str then error('Reached unexpected end of input.') end
	pos = pos + #str:match('^%s*', pos) -- skip whitespace
	local first = str:sub(pos, pos)
	if first == '{' then -- object
		local obj, delimfound = {}, true
		local key
		pos = pos + 1
		while true do
			key, pos = json.parse(str, pos, '}')
			if key == nil then return obj, pos end
			if not delimfound then error('Comma missing between object items.') end
			pos = skipdelim(str, pos, ':', true) -- true -> error if missing
			obj[key], pos = json.parse(str, pos)
			pos, delimfound = skipdelim(str, pos, ',')
		end
	elseif first == '[' then -- array
		local arr, delimfound = {}, true
		local val
		pos = pos + 1
		while true do
			val, pos = json.parse(str, pos, ']')
			if val == nil then return arr, pos end
			if not delimfound then error('Comma missing between array items.') end
			arr[#arr + 1] = val
			pos, delimfound = skipdelim(str, pos, ',')
		end
	elseif first == '"' then -- string
		return parsestrval(str, pos + 1)
	elseif first == '-' or first:match('%d') then -- number
		return parsenumval(str, pos)
	elseif first == enddelim then -- end of object or array
		return nil, pos + 1
	else -- true/false/null
		local lits = { ['true'] = true, ['false'] = false, null = json.null }
		for litstr, litval in pairs(lits) do
			local litend = pos + #litstr - 1
			if str:sub(pos, litend) == litstr then return litval, litend + 1 end
		end
		local posinfostr = 'position '..pos..': '..str:sub(pos, pos + 10)
		error('Invalid json syntax starting at '..posinfostr)
	end
end

return json
