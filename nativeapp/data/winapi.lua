local winapi = {}

local ffi = require'ffi'
local bit = require'bit'

ffi.cdef[[

typedef struct FILE FILE;
FILE* fopen(const char*, const char* mode);
size_t fwrite(const void* ptr, size_t nptr, size_t nmembers, FILE*);
int fprintf(FILE*, const char* format, ...);
int fclose(FILE*);

// wine/include/

// basetsd.h

typedef signed char INT8, *PINT8;
typedef signed short INT16, *PINT16;
typedef signed int INT32, *PINT32;
typedef unsigned char UINT8, *PUINT8;
typedef unsigned short UINT16, *PUINT16;
typedef unsigned int UINT32, *PUINT32;
typedef signed int LONG32, *PLONG32;
typedef unsigned int ULONG32, *PULONG32;
typedef unsigned int DWORD32, *PDWORD32;
typedef int64_t INT64, *PINT64;
typedef uint64_t UINT64, *PUINT64;
typedef int64_t LONG64, *PLONG64;
typedef uint64_t ULONG64, *PULONG64;
typedef uint64_t DWORD64, *PDWORD64;
typedef signed long INT_PTR, *PINT_PTR;
typedef signed long LONG_PTR, *PLONG_PTR;
typedef unsigned long UINT_PTR, *PUINT_PTR;
typedef unsigned long ULONG_PTR, *PULONG_PTR;
typedef ULONG_PTR DWORD_PTR, *PDWORD_PTR;

// windef.h

enum {
	FALSE = 0,
	TRUE = 1,
};
typedef void *LPVOID;
typedef const void *LPCVOID;
typedef int BOOL, *PBOOL, *LPBOOL;
typedef unsigned char BYTE, *PBYTE, *LPBYTE;
typedef unsigned char UCHAR, *PUCHAR;
typedef unsigned short WORD, *PWORD, *LPWORD;
typedef unsigned short USHORT, *PUSHORT;
typedef int INT, *PINT, *LPINT;
typedef unsigned int UINT, *PUINT;
typedef float FLOAT, *PFLOAT;
typedef char *PSZ;
typedef long *LPLONG;
typedef unsigned long DWORD, *PDWORD, *LPDWORD;
typedef unsigned long ULONG, *PULONG;

// winnt.h

typedef void VOID;
typedef VOID *PVOID;
typedef VOID *PVOID64;
typedef BYTE BOOLEAN, *PBOOLEAN;
typedef char CHAR, *PCHAR;
typedef short SHORT, *PSHORT;
typedef long LONG, *PLONG;
typedef wchar_t WCHAR, *PWCHAR;
typedef ULONG UCSCHAR;
typedef int64_t LONGLONG, *PLONGLONG;
typedef uint64_t ULONGLONG, *PULONGLONG;
typedef ULONGLONG DWORDLONG, *PDWORDLONG;
typedef CHAR *PCH, *LPCH, *PNZCH;
typedef const CHAR *PCCH, *LPCCH, *PCNZCH;
typedef CHAR *PSTR, *LPSTR, *NPSTR;
typedef const CHAR *PCSTR, *LPCSTR;
typedef CHAR *PZZSTR;
typedef const CHAR *PCZZSTR;
typedef const WCHAR *PCWCHAR, *LPCUWCHAR, *PCUWCHAR;
typedef WCHAR *PWCH, *LPWCH;
typedef const WCHAR *PCWCH, *LPCWCH;
typedef WCHAR *PNZWCH, *PUNZWCH;
typedef const WCHAR *PCNZWCH, *PCUNZWCH;
typedef WCHAR *PWSTR, *LPWSTR, *NWPSTR;
typedef const WCHAR *PCWSTR, *LPCWSTR;
typedef WCHAR *PZZWSTR, *PUZZWSTR;
typedef const WCHAR *PCZZWSTR, *PCUZZWSTR;
typedef PWSTR *PZPWSTR;
typedef PCWSTR *PZPCWSTR;
typedef WCHAR TCHAR, *PTCHAR;
typedef LPWCH PTCH, LPTCH;
typedef LPCWCH PCTCH, LPCTCH;
typedef LPWSTR PTSTR, LPTSTR;
typedef LPCWSTR PCTSTR, LPCTSTR;
typedef LPWSTR PUTSTR, LPUTSTR;
typedef LPCWSTR PCUTSTR, LPCUTSTR;
typedef PNZWCH PNZTCH;
typedef PUNZWCH PUNZTCH;
typedef PCNZWCH PCNZTCH;
typedef PCUNZWCH PCUNZTCH;
typedef PZZWSTR PZZTSTR;
typedef PCZZWSTR PCZZTSTR;
typedef PUZZWSTR PUZZTSTR;
typedef PCUZZWSTR PCUZZTSTR;
typedef CHAR TCHAR, *PTCHAR;
typedef LPCH PTCH, LPTCH;
typedef LPCCH PCTCH, LPCTCH;
typedef LPSTR PTSTR, LPTSTR;
typedef LPCSTR PCTSTR, LPCTSTR;
typedef PNZCH PNZTCH, PUNZTCH;
typedef PCNZCH PCNZTCH, PCUNZTCH;
typedef PZZSTR PZZTSTR, PUZZTSTR;
typedef PCZZSTR PCZZTSTR, PCUZZTSTR;
typedef UCSCHAR *PUCSCHAR, *PUUCSCHAR;
typedef const UCSCHAR *PCUCSCHAR, *PCUUCSCHAR;
typedef UCSCHAR *PUCSSTR, *PUUCSSTR;
typedef const UCSCHAR *PCUCSSTR, *PCUUCSSTR;
typedef char CCHAR;
typedef DWORD LCID, *PLCID;
typedef WORD LANGID;
typedef DWORD EXECUTION_STATE;
typedef LONG HRESULT;
typedef void *HANDLE;
typedef HANDLE *PHANDLE, *LPHANDLE;
typedef BYTE FCHAR;
typedef WORD FSHORT;
typedef DWORD FLONG;

// winnls.h

INT MultiByteToWideChar(UINT, DWORD, LPCSTR, INT, LPWSTR, INT);
INT WideCharToMultiByte(UINT, DWORD, LPCWSTR, INT, LPSTR, INT, LPCSTR, LPBOOL);

// windef.h

enum {
	MAX_PATH = 260
};
typedef UINT_PTR WPARAM;
typedef LONG_PTR LPARAM;
typedef LONG_PTR LRESULT;
typedef WORD ATOM;
typedef DWORD COLORREF, *LPCOLORREF;
typedef int HFILE;
typedef HANDLE HACCEL;
typedef HANDLE HBITMAP;
typedef HANDLE HBRUSH;
typedef HANDLE HCOLORSPACE;
typedef HANDLE HDC;
typedef HANDLE HDESK;
typedef HANDLE HENHMETAFILE;
typedef HANDLE HFONT;
typedef HANDLE HGLRC;
typedef HANDLE HHOOK;
typedef HANDLE HICON;
typedef HANDLE HINSTANCE;
typedef HANDLE HKEY;
typedef HKEY *PHKEY;
typedef HANDLE HKL;
typedef HANDLE HMENU;
typedef HANDLE HMETAFILE;
typedef HANDLE HMONITOR;
typedef HANDLE HPALETTE;
typedef HANDLE HPEN;
typedef HANDLE HRGN;
typedef HANDLE HRSRC;
typedef HANDLE HTASK;
typedef HANDLE HWINEVENTHOOK;
typedef HANDLE HWINSTA;
typedef HANDLE HWND;
typedef HINSTANCE HMODULE;
typedef HANDLE HGDIOBJ;
typedef HANDLE HGLOBAL;
typedef HANDLE HLOCAL;
typedef HANDLE GLOBALHANDLE;
typedef HANDLE LOCALHANDLE;
typedef HICON HCURSOR;
typedef INT_PTR (*FARPROC)();
typedef INT_PTR (*NEARPROC)();
typedef INT_PTR (*PROC)();
typedef struct tagSIZE {
	LONG cx;
	LONG cy;
} SIZE, *PSIZE, *LPSIZE;
typedef SIZE SIZEL, *PSIZEL, *LPSIZEL;
typedef struct tagPOINT {
	LONG x;
	LONG y;
} POINT, *PPOINT, *LPPOINT;
typedef POINT POINTL, *PPOINTL;
typedef struct tagPOINTS {
	SHORT x;
	SHORT y;
} POINTS, *PPOINTS, *LPPOINTS;
typedef struct tagRECT {
	LONG left;
	LONG top;
	LONG right;
	LONG bottom;
} RECT, *PRECT, *LPRECT;
typedef const RECT *LPCRECT;
typedef RECT RECTL, *PRECTL, *LPRECTL;
typedef const RECTL *LPCRECTL;

// winerror.h

enum {
	ERROR_INSUFFICIENT_BUFFER = 122,
};

// winbase.h

enum {
	FORMAT_MESSAGE_ALLOCATE_BUFFER = 0x00000100,
	FORMAT_MESSAGE_IGNORE_INSERTS = 0x00000200,
	FORMAT_MESSAGE_FROM_STRING = 0x00000400,
	FORMAT_MESSAGE_FROM_HMODULE = 0x00000800,
	FORMAT_MESSAGE_FROM_SYSTEM = 0x00001000,
	FORMAT_MESSAGE_ARGUMENT_ARRAY = 0x00002000,
	FORMAT_MESSAGE_MAX_WIDTH_MASK = 0x000000FF,
};
DWORD GetCurrentProcessId();
DWORD GetCurrentThreadId();
DWORD GetLastError();
HANDLE GetProcessHeap();
VOID SetLastError(DWORD);
DWORD FormatMessageA(DWORD, LPCVOID, DWORD, DWORD, LPCSTR, DWORD, va_list*);

// winuser.h

enum {
	MB_OK = 0x00000000,
	MB_OKCANCEL = 0x00000001,
	MB_ABORTRETRYIGNORE = 0x00000002,
	MB_YESNOCANCEL = 0x00000003,
	MB_YESNO = 0x00000004,
	MB_RETRYCANCEL = 0x00000005,
	MB_CANCELTRYCONTINUE = 0x00000006,
	MB_TYPEMASK = 0x0000000F,
};
INT MessageBoxW(HWND, LPCWSTR, LPCWSTR, UINT);

// winuser.h

typedef struct _ICONINFO {
	BOOL fIcon;
	DWORD xHotspot;
	DWORD yHotspot;
	HBITMAP hbmMask;
	HBITMAP hbmColor;
} ICONINFO, *PICONINFO;
HDC GetDC(HWND);
INT ReleaseDC(HWND, HDC);
BOOL GetIconInfo(HICON, PICONINFO);
BOOL DestroyIcon(HICON);

// wingdi.h
enum {
	DIB_RGB_COLORS = 0,
	DIB_PAL_COLORS = 1,
	CBM_INIT = 4,
};
enum {
	BI_RGB = 0,
	BI_RLE8 = 1,
	BI_RLE4 = 2,
	BI_BITFIELDS = 3,
	BI_JPEG = 4,
	BI_PNG = 5,
};
typedef struct tagRGBQUAD {
	BYTE rgbBlue;
	BYTE rgbGreen;
	BYTE rgbRed;
	BYTE rgbReserved;
} RGBQUAD, *LPRGBQUAD;
typedef struct {
	DWORD biSize;
	LONG biWidth;
	LONG biHeight;
	WORD biPlanes;
	WORD biBitCount;
	DWORD biCompression;
	DWORD biSizeImage;
	LONG biXPelsPerMeter;
	LONG biYPelsPerMeter;
	DWORD biClrUsed;
	DWORD biClrImportant;
} BITMAPINFOHEADER, *PBITMAPINFOHEADER, *LPBITMAPINFOHEADER;
typedef struct {
	BITMAPINFOHEADER bmiHeader;
	RGBQUAD bmiColors[1];
} BITMAPINFO, *PBITMAPINFO, *LPBITMAPINFO;
typedef struct {
	INT bmType;
	INT bmWidth;
	INT bmHeight;
	INT bmWidthBytes;
	WORD bmPlanes;
	WORD bmBitsPixel;
	LPVOID bmBits;
} BITMAP, *PBITMAP, *LPBITMAP;
INT GetObjectW(HGDIOBJ, INT, LPVOID);
BOOL DeleteObject(HGDIOBJ);
LONG GetBitmapBits(HBITMAP, LONG, LPVOID);
INT GetDIBits(HDC, HBITMAP, UINT, UINT, LPVOID, LPBITMAPINFO, UINT);

// shellapi.h

enum {
	SHGFI_LARGEICON = 0x000000000,         /* get large icon */
	SHGFI_SMALLICON = 0x000000001,         /* get small icon */
	SHGFI_OPENICON = 0x000000002,          /* get open icon */
	SHGFI_SHELLICONSIZE = 0x000000004,     /* get shell size icon */
	SHGFI_PIDL = 0x000000008,              /* pszPath is a pidl */
	SHGFI_USEFILEATTRIBUTES = 0x000000010, /* use passed dwFileAttribute */
	SHGFI_ADDOVERLAYS = 0x000000020,
	SHGFI_OVERLAYINDEX = 0x000000040,
	SHGFI_ICON = 0x000000100,              /* get icon */
	SHGFI_DISPLAYNAME = 0x000000200,       /* get display name */
	SHGFI_TYPENAME = 0x000000400,          /* get type name */
	SHGFI_ATTRIBUTES = 0x000000800,        /* get attributes */
	SHGFI_ICONLOCATION = 0x000001000,      /* get icon location */
	SHGFI_EXETYPE = 0x000002000,           /* return exe type */
	SHGFI_SYSICONINDEX = 0x000004000,      /* get system icon index */
	SHGFI_LINKOVERLAY = 0x000008000,       /* put a link overlay on icon */
	SHGFI_SELECTED = 0x000010000,          /* show icon in selected state */
	SHGFI_ATTR_SPECIFIED = 0x000020000,    /* get only specified attributes */
};
typedef struct tagSHFILEINFOW {
	HICON hIcon;
	int iIcon;
	DWORD dwAttributes;
	WCHAR szDisplayName[260];
	WCHAR szTypeName[80];
} SHFILEINFOW;
DWORD_PTR SHGetFileInfoW(LPCWSTR, DWORD, SHFILEINFOW*, UINT, UINT);
HICON ExtractIconW(HINSTANCE, LPCWSTR, UINT);
UINT ExtractIconExW(LPCWSTR, INT, HICON*, HICON*, UINT);
HICON ExtractAssociatedIconW(HINSTANCE, LPWSTR, LPWORD);
HICON ExtractAssociatedIconExW(HINSTANCE, LPWSTR, LPWORD, LPWORD);
]]

local C = ffi.C
local K = ffi.load'kernel32'
local S = ffi.load'shell32'
local U = ffi.load'user32'
local G = ffi.load'gdi32'

winapi.kernel32 = K
winapi.shell32 = S
winapi.user32 = U
winapi.gdi32 = G

local function ptr(h) if h == nil then return end return h end

local function errmsg(id)
	if id == 8 then
		error'out of memory'
	end
	local nbuf = 2048
	local buf = ffi.new('char[?]', nbuf)
	local sz = K.FormatMessageA(C.FORMAT_MESSAGE_FROM_SYSTEM, nil, id, 0, buf, nbuf, nil)
	if sz == 0 and K.GetLastError() == 8 then
		error('out of memory getting error message for %d', id)
	end
	assert(sz ~= 0, 'error getting error message for %d: %d', id, K.GetLastError())
	return ffi.string(buf, sz)
end
local function errchk(msg)
	local code = K.GetLastError()
	if code ~= 0 then
		msg = errmsg(code)
	end
	winapi.chknz(U.MessageBoxW(nil, winapi.wcs(msg), winapi.wcs'Error', C.MB_OK))
	error(msg, 3)
end
function winapi.chknz(v)
	if v ~= 0 then return v end
	errchk'non-zero expected, got zero'
end
function winapi.chktrue(v)
	if v == 1 then return v end
	errchk'1 (true) expected, got 0 (false)'
end
function winapi.chkh(v)
	if v ~= nil then return v end
	errchk'non NULL value expected, got NULL'
end
function winapi.chkpoz(v)
	if v >= 0 then return v end
	errchk'positive number expected, got negative'
end

function winapi.wcs(s)
	if type(s) ~= 'string' then return s end
	local sz = #s + 1
	local buf = ffi.new('WCHAR[?]', sz)
	C.MultiByteToWideChar(65001, 0, s, sz, buf, sz)
	return buf
end

function winapi.mbs(ws)
	if not ffi.istype('WCHAR[?]', ws) and not ffi.istype('WCHAR*', ws) then return ws end
	local chknz = winapi.chknz
	local sz = chknz(C.WideCharToMultiByte(65001, 0, ws, -1, nil, 0, nil, nil))
	local buf = ffi.new('char[?]', sz)
	chknz(C.WideCharToMultiByte(65001, 0, ws, -1, buf, sz, nil, nil))
	return ffi.string(buf, sz - 1)
end


ffi.cdef[[
typedef struct {
	BITMAPINFOHEADER icHeader; // DIB header
	// RGBQUAD icColors[1]; // Color table
	// BYTE icXOR[1]; // DIB bits for XOR mask
	// BYTE icAND[1]; // DIB bits for AND mask
} ICONIMAGE, *LPICONIMAGE;
typedef struct {
	BYTE bWidth; // Width, in pixels, of the image
	BYTE bHeight; // Height, in pixels, of the image
	BYTE bColorCount; // Number of colors in image (0 if >=8bpp)
	BYTE bReserved; // Reserved (must be 0)
	WORD wPlanes; // Color Planes
	WORD wBitCount; // Bits per pixel
	DWORD dwBytesInRes; // How many bytes in this resource?
	DWORD dwImageOffset; // Where in the file is this image?
} ICONDIRENTRY, *LPICONDIRENTRY;
typedef struct {
	WORD idReserved; // Reserved (must be 0)
	WORD idType; // Resource Type (1 for icons)
	WORD idCount; // How many images?
	// ICONDIRENTRY idEntries[1]; // An entry for each image (idCount of 'em)
} ICONDIR, *LPICONDIR;
]]
local function bmpsize(bmp)
	local wb = bmp.bmWidthBytes
	if bit.band(wb, 3) ~= 0 then
		wb = bit.band(wb + 4, bit.bnot(3))
	end
	return wb * bmp.bmHeight
end
local function writeiconimageheader(fp, colbmp, maskbmp)
	local sz = ffi.sizeof'BITMAPINFOHEADER'
	local st = ffi.new('BITMAPINFOHEADER', {
		biSize = sz,
		biWidth = colbmp.bmWidth,
		biHeight = colbmp.bmHeight * 2,
		biPlanes = colbmp.bmPlanes,
		biBitCount = colbmp.bmBitsPixel,
		biSizeImage = bmpsize(colbmp) + bmpsize(maskbmp),
	})
	C.fwrite(st, sz, 1, fp)
	-- RGBQUAD? (apparently for 16 and 256 color icons)
end
local function writeicondata(fp, hbmp)
	local bmp = ffi.new'BITMAP'
	G.GetObjectW(hbmp, ffi.sizeof'BITMAP', bmp)
	local ndata = bmpsize(bmp)
	local data = ffi.new('BYTE[?]', ndata)
	G.GetBitmapBits(hbmp, ndata, data)
	for i = bmp.bmHeight - 1, 0, -1 do
		C.fwrite(data + (i * bmp.bmWidthBytes), bmp.bmWidthBytes, 1, fp)
		if bit.band(bmp.bmWidthBytes, 3) ~= 0 then
			C.fwrite(ffi.new'DWORD[1]', 4 - bmp.bmWidthBytes, 1, fp)
		end
	end
end
local function geticonbitmapinfo(hicon, info, colbmp, maskbmp)
	U.GetIconInfo(hicon, info)
	G.GetObjectW(info.hbmColor, ffi.sizeof'BITMAP', colbmp)
	G.GetObjectW(info.hbmMask, ffi.sizeof'BITMAP', maskbmp)
end
local function writeicondirentry(fp, hicon, imgoffset)
	local info = ffi.new'ICONINFO'
	local colbmp, maskbmp = ffi.new'BITMAP', ffi.new'BITMAP'
	geticonbitmapinfo(hicon, info, colbmp, maskbmp)
	local nimages = bmpsize(colbmp) + bmpsize(maskbmp)
	local colorcount = 0
	if colbmp.bmBitsPixel < 8 then
		colorcount = bit.lshift(1, colbmp.bmBitsPixel * colbmp.bmPlanes)
	end
	local st = ffi.new('ICONDIRENTRY', {
		bWidth = colbmp.bmWidth,
		bHeight = colbmp.bmHeight,
		bColorCount = colorcount,
		wPlanes = colbmp.bmPlanes,
		wBitCount = colbmp.bmBitsPixel,
		dwBytesInRes = ffi.sizeof'BITMAPINFOHEADER' + nimages,
		dwImageOffset = imgoffset,
	})
	C.fwrite(st, ffi.sizeof'ICONDIRENTRY', 1, fp)
	G.DeleteObject(info.hbmColor)
	G.DeleteObject(info.hbmMask)
end
local function savehicon(path, hicons, nicons)
	local fp = io.open(path, 'wb')
	C.fwrite(ffi.new('ICONDIR', {0, 1, nicons}), ffi.sizeof'ICONDIR', 1, fp)
	fp:seek('cur', ffi.sizeof'ICONDIRENTRY' * nicons)
	local imgoffsets = ffi.new('int[?]', nicons)
	for i = 0, nicons-1 do
		local info = ffi.new'ICONINFO'
		local colbmp, maskbmp = ffi.new'BITMAP', ffi.new'BITMAP'
		geticonbitmapinfo(hicons[i], info, colbmp, maskbmp)
		imgoffsets[i] = fp:seek()
		writeiconimageheader(fp, colbmp, maskbmp)
		writeicondata(fp, info.hbmColor)
		writeicondata(fp, info.hbmMask)
		G.DeleteObject(info.hbmColor)
		G.DeleteObject(info.hbmMask)
	end
	fp:seek('set', ffi.sizeof'ICONDIR')
	for i = 0, nicons-1 do
		writeicondirentry(fp, hicons[i], imgoffsets[i])
	end
	fp:close()
end
function winapi.savefileicon(filepath, iconpath, islarge)
	local sfi = ffi.new'SHFILEINFOW'
	local flags = bit.bor(C.SHGFI_ICON, islarge and C.SHGFI_LARGEICON or C.SHGFI_SMALLICON)
	S.SHGetFileInfoW(winapi.wcs(filepath), 0x00000080, sfi, ffi.sizeof(sfi), flags)
	if sfi.hIcon == nil then return end
	savehicon(iconpath, ffi.new('HICON[1]', sfi.hIcon), 1)
	U.DestroyIcon(sfi.hIcon)
	return iconpath
end

return winapi

-- C.SHGFI_USEFILEATTRIBUTES

-- local small = ffi.new'HICON[1]'
-- local large = ffi.new'HICON[1]'
-- if S.ExtractIconExW(winapi.wcs(from), 0, large, small, 1) == 0 then return end
-- local icon = small[0]
-- local idx = ffi.new'WORD[1]'
-- small[0] = iconfromfile(from)
-- small[0] = S.ExtractAssociatedIconW(nil, winapi.wcs(from), idx)
-- return saveiconb(to, small, 1)
-- local icon = S.ExtractAssociatedIconW(nil, winapi.wcs(from), ffi.new'WORD[1]')

-- local function writedata(fp, hdc, hicon, pos, entry)
-- 	local info = ffi.new'ICONINFO'
-- 	U.GetIconInfo(hicon, info)
-- 	local hbmcolor = info.hbmColor
-- 	local hbmmask = info.hbmMask
-- 	local colhdr = ffi.new'BITMAPINFO'
-- 	colhdr.bmiHeader.biSize = ffi.sizeof'BITMAPINFOHEADER'
-- 	G.GetDIBits(hdc, hbmcolor, 0, 0, nil, colhdr, C.DIB_RGB_COLORS)
-- 	local nbminfohdr = ffi.sizeof'BITMAPINFOHEADER'
-- 	if colhdr.bmiHeader.biBitCount <= 8 then
-- 		nbminfohdr = nbminfohdr + bit.lshift(1, colhdr.bmiHeader.biBitCount) * ffi.sizeof'RGBQUAD'
-- 	end
-- 	local colhdrallp = ffi.cast('BITMAPINFO*', ffi.new('char[?]', nbminfohdr))
-- 	local colhdrall = colhdrallp[0]
-- 	ffi.copy(colhdrall, colhdr, ffi.sizeof'BITMAPINFOHEADER')
-- 	local imgdata = ffi.new('char[?]', colhdr.bmiHeader.biSizeImage)
-- 	colhdrall.bmiHeader.biCompression = C.BI_RGB
-- 	G.GetDIBits(hdc, hbmcolor, 0, colhdr.bmiHeader.biHeight, imgdata, colhdrallp, C.DIB_RGB_COLORS)
-- 	local maskhdr = ffi.new'BITMAPINFO'
-- 	maskhdr.bmiHeader.biSize = ffi.sizeof'BITMAPINFOHEADER'
-- 	G.GetDIBits(hdc, hbmmask, 0, 0, nil, maskhdr, C.DIB_RGB_COLORS)
-- 	local maskdata = ffi.new('char[?]', colhdr.bmiHeader.biSizeImage)
-- 	local nmaskhdrall = ffi.sizeof'BITMAPINFO' +
-- 		ffi.sizeof'RGBQUAD' * (maskhdr.bmiHeader.biBitCount < 16 and maskhdr.bmiHeader.biClrUsed or 0)
-- 	local maskhdrallp = ffi.cast('BITMAPINFO*', ffi.new('char[?]', nmaskhdrall))
-- 	local maskhdrall = maskhdrallp[0]
-- 	maskhdrall.bmiHeader.biCompression = C.BI_RGB
-- 	G.GetDIBits(hdc, hbmmask, 0, maskhdr.bmiHeader.biHeight, maskdata, maskhdrallp, C.DIB_RGB_COLORS)
-- 	entry.bWidth = colhdrall.bmiHeader.biWidth
-- 	entry.bHeight = colhdrall.bmiHeader.biHeight
-- 	entry.bColorCount = (colhdr.bmiHeader.biBitCount > 8 and 0 or bit.lshift(1, colhdr.bmiHeader.biBitCount))
-- 	entry.bReserved = 0
-- 	entry.wPlanes = 0
-- 	entry.wBitCount = colhdrall.bmiHeader.biBitCount
-- 	entry.dwBytesInRes = nbminfohdr + colhdrall.bmiHeader.biSizeImage + maskhdrall.bmiHeader.biSizeImage
-- 	entry.dwImageOffset = pos
-- 	local nimgdata = colhdrall.bmiHeader.biSizeImage;
-- 	colhdrall.bmiHeader.biHeight = colhdrall.bmiHeader.biHeight * 2
-- 	colhdrall.bmiHeader.biCompression = 0
-- 	colhdrall.bmiHeader.biSizeImage = colhdrall.bmiHeader.biSizeImage + maskhdrall.bmiHeader.biSizeImage
-- 	fp:seek('set', pos)
-- 	C.fwrite(colhdrall, nbminfohdr, 1, fp)
-- 	C.fwrite(imgdata, nimgdata, 1, fp)
-- 	C.fwrite(maskdata, maskhdrall.bmiHeader.biSizeImage, 1, fp)
-- 	G.DeleteObject(hbmcolor)
-- 	G.DeleteObject(hbmmask)
-- end
-- local function saveiconb(path, icons, nicons)
-- 	local hdc = U.GetDC(nil)
-- 	local fp = io.open(path, 'wb')
-- 	C.fwrite(ffi.new('ICONDIR', {0, 1, nicons}), ffi.sizeof'ICONDIR', 1, fp)
-- 	local datapos = ffi.sizeof'ICONDIR' + nicons * ffi.sizeof'ICONDIRENTRY'
-- 	for i = 0, nicons-1 do
-- 		local entry = ffi.new'ICONDIRENTRY'
-- 		writedata(fp, hdc, icons[i], datapos, entry)
-- 		datapos = fp:seek()
-- 		fp:seek('set', ffi.sizeof'ICONDIR' + i * ffi.sizeof'ICONDIRENTRY')
-- 		C.fwrite(entry, ffi.sizeof'ICONDIRENTRY', 1, fp)
-- 	end
-- 	fp:close()
-- 	U.ReleaseDC(nil, hdc)
-- end
