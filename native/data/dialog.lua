local dialog

if jit.os == 'Windows' then
	dialog = require'dialog_winapi'
elseif jit.os == 'OSX' then
	dialog = nil
else
	dialog = require'dialog_gtk3'
end

return dialog
