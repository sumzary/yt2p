local dialog = {}

local ffi = require'ffi'
local fs = require'fs'
local winapi = require'winapi'

ffi.cdef[[

// wine/include/

// commdlg.h

typedef UINT_PTR (*LPOFNHOOKPROC) (HWND, UINT, WPARAM, LPARAM);
typedef struct tagOFNW {
	DWORD lStructSize;
	HWND hwndOwner;
	HINSTANCE hInstance;
	LPCWSTR lpstrFilter;
	LPWSTR lpstrCustomFilter;
	DWORD nMaxCustFilter;
	DWORD nFilterIndex;
	LPWSTR lpstrFile;
	DWORD nMaxFile;
	LPWSTR lpstrFileTitle;
	DWORD nMaxFileTitle;
	LPCWSTR lpstrInitialDir;
	LPCWSTR lpstrTitle;
	DWORD Flags;
	WORD nFileOffset;
	WORD nFileExtension;
	LPCWSTR lpstrDefExt;
	LPARAM lCustData;
	LPOFNHOOKPROC lpfnHook;
	LPCWSTR lpTemplateName;
	void* pvReserved;
	DWORD dwReserved;
	DWORD FlagsEx;
} OPENFILENAMEW, *LPOPENFILENAMEW;
DWORD CommDlgExtendedError();
BOOL GetOpenFileNameW(LPOPENFILENAMEW);
BOOL GetSaveFileNameW(LPOPENFILENAMEW);
]]

local CD = ffi.load'comdlg32'

local commdlgerrnames = {
	[0xFFFF] = 'CDERR_DIALOGFAILURE',
	[0x0000] = 'CDERR_GENERALCODES',
	[0x0001] = 'CDERR_STRUCTSIZE',
	[0x0002] = 'CDERR_INITIALIZATION',
	[0x0003] = 'CDERR_NOTEMPLATE',
	[0x0004] = 'CDERR_NOHINSTANCE',
	[0x0005] = 'CDERR_LOADSTRFAILURE',
	[0x0006] = 'CDERR_FINDRESFAILURE',
	[0x0007] = 'CDERR_LOADRESFAILURE',
	[0x0008] = 'CDERR_LOCKRESFAILURE',
	[0x0009] = 'CDERR_MEMALLOCFAILURE',
	[0x000A] = 'CDERR_MEMLOCKFAILURE',
	[0x000B] = 'CDERR_NOHOOK',
	[0x000C] = 'CDERR_REGISTERMSGFAIL',
	[0x1000] = 'PDERR_PRINTERCODES',
	[0x1001] = 'PDERR_SETUPFAILURE',
	[0x1002] = 'PDERR_PARSEFAILURE',
	[0x1003] = 'PDERR_RETDEFFAILURE',
	[0x1004] = 'PDERR_LOADDRVFAILURE',
	[0x1005] = 'PDERR_GETDEVMODEFAIL',
	[0x1006] = 'PDERR_INITFAILURE',
	[0x1007] = 'PDERR_NODEVICES',
	[0x1008] = 'PDERR_NODEFAULTPRN',
	[0x1009] = 'PDERR_DNDMMISMATCH',
	[0x100A] = 'PDERR_CREATEICFAILURE',
	[0x100B] = 'PDERR_PRINTERNOTFOUND',
	[0x100C] = 'PDERR_DEFAULTDIFFERENT',
	[0x2000] = 'CFERR_CHOOSEFONTCODES',
	[0x2001] = 'CFERR_NOFONTS',
	[0x2002] = 'CFERR_MAXLESSTHANMIN',
	[0x3000] = 'FNERR_FILENAMECODES',
	[0x3001] = 'FNERR_SUBCLASSFAILURE',
	[0x3002] = 'FNERR_INVALIDFILENAME',
	[0x3003] = 'FNERR_BUFFERTOOSMALL',
	[0x4000] = 'FRERR_FINDREPLACECODES',
	[0x4001] = 'FRERR_BUFFERLENGTHZERO',
	[0x5000] = 'CCERR_CHOOSECOLORCODES',
}
local function chkcomdlg(ret)
	if ret == 0 then
		local err = CD.CommDlgExtendedError()
		assert(err == 0, 'comdlg32 error: %s', commdlgerrnames[err])
		return false -- user canceled
	end
	return true
end

local dirpaths = {
	['<applications>'] = 'C:\\Program Files',
	['<icons>'] = 'C:\\Program Files',
}
local function rundialog(o, issave)
	local ofn = ffi.new('OPENFILENAMEW', {
		lStructSize = ffi.sizeof'OPENFILENAMEW',
		lpstrTitle = winapi.wcs(o.title),
		lpstrFile = ffi.new('WCHAR[?]', 260),
		nMaxFile = 260,
	})
	if o.dir then
		ofn.lpstrInitialDir = winapi.wcs(dirpaths[o.dir] or o.dir)
	end
	if o.filters then
		local ft = {}
		for _, v in ipairs(o.filters) do
			if v == '<all>' then
				table.insert(ft, 'All Files')
				table.insert(ft, '*')
			elseif v == '<application>' then
				table.insert(ft, 'Applications')
				table.insert(ft, '*.com;*.exe;*.bat;*.cmd;*.vbs;*.vbe;*.js;*.jse')
			elseif v == '<icon>' then
				table.insert(ft, 'Icon Files')
				table.insert(ft, '*.exe;*.ico;*.bmp;*.gif;*.png;*.jpg;*.jpeg;*.svg')
			elseif type(v) == 'table' then
				table.insert(ft, v.name)
				table.insert(ft, v.pattern)
			end
		end
		table.insert(ft, '\0')
		ofn.lpstrFilter = winapi.wcs(table.concat(ft, '\0'))
	end
	local cd = fs.curdir()
	if issave then
		if not chkcomdlg(CD.GetSaveFileNameW(ofn)) then return end
	else
		if not chkcomdlg(CD.GetOpenFileNameW(ofn)) then return end
	end
	fs.chdir(cd)
	return winapi.mbs(ofn.lpstrFile)
end

function dialog.open(o)
	o = o or {}
	o.title = o.title or 'Open file'
	o.filters = o.filters or { '<all>' }
	return rundialog(o)
end

function dialog.save(o)
	o = o or {}
	o.title = o.title or 'Save file'
	o.filters = o.filters or { '<all>' }
	return rundialog(o, true)
end

function dialog.folder(o)
	-- SHBrowseForFolder
	error'NYI'
end

return dialog
