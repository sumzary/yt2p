local dialog = {}

local ffi = require'ffi'

ffi.cdef[[

char* gettext(const char*);

// glib/

// gtypes.h

typedef char gchar;
typedef short gshort;
typedef long glong;
typedef int gint;
typedef gint gboolean;
typedef unsigned char guchar;
typedef unsigned short gushort;
typedef unsigned long gulong;
typedef unsigned int guint;
typedef float gfloat;
typedef double gdouble;
typedef void* gpointer;
typedef const void* gconstpointer;

// gerror.h

typedef struct _GError GError;

// gmem.h

void g_free(gpointer);

// gmessages.h
typedef enum {
	G_LOG_FLAG_RECURSION = 1 << 0,
	G_LOG_FLAG_FATAL = 1 << 1,
	G_LOG_LEVEL_ERROR = 1 << 2,
	G_LOG_LEVEL_CRITICAL = 1 << 3,
	G_LOG_LEVEL_WARNING = 1 << 4,
	G_LOG_LEVEL_MESSAGE = 1 << 5,
	G_LOG_LEVEL_INFO = 1 << 6,
	G_LOG_LEVEL_DEBUG = 1 << 7,
	G_LOG_LEVEL_MASK = ~(G_LOG_FLAG_RECURSION | G_LOG_FLAG_FATAL),
} GLogLevelFlags;
typedef void (*GLogFunc)(const gchar* log_domain,
	GLogLevelFlags log_level, const gchar* message, gpointer user_data);
guint g_log_set_handler(const gchar* log_domain,
	GLogLevelFlags log_levels, GLogFunc, gpointer user_data);
void g_log_remove_handler(const gchar* log_domain,
	guint handler_id);
void g_log_default_handler(const gchar* log_domain,
	GLogLevelFlags log_level, const gchar* message, gpointer unused_data);
GLogFunc g_log_set_default_handler(GLogFunc, gpointer user_data);

// gclosure.h

typedef struct _GClosure GClosure;
typedef void (*GCallback)();
typedef void (*GClosureNotify)(gpointer data, GClosure*);

// gsignal.h

typedef enum {
	G_CONNECT_AFTER = 1 << 0,
	G_CONNECT_SWAPPED	= 1 << 1,
} GConnectFlags;
gulong g_signal_connect_data(gpointer instance,
	const gchar* detailed_signal, GCallback handler,
	gpointer data, GClosureNotify destroy_data, GConnectFlags connect_flags);
typedef void (*response_proc)(void* obj, int id, void* userdata);
gulong _connect_response(gpointer instance,
	const gchar* detailed_signal, response_proc handler,
	gpointer data, GClosureNotify destroy_data,
	GConnectFlags connect_flags) asm("g_signal_connect_data");

// gobject.h

typedef struct _GObject GObject;
void g_object_unref(gpointer);

// gtk/

// gtktypes.h

typedef struct _GtkWidget GtkWidget;
typedef struct _GtkWidgetPath GtkWidgetPath;
typedef struct _GtkWindow GtkWindow;

// gtkmain.h

void gtk_init(int* argc, char*** argv);
void gtk_main();
void gtk_main_quit();

// gtkwindow.h

typedef enum {
	GTK_WINDOW_TOPLEVEL,
	GTK_WINDOW_POPUP
} GtkWindowType;
typedef enum {
	GTK_WIN_POS_NONE,
	GTK_WIN_POS_CENTER,
	GTK_WIN_POS_MOUSE,
	GTK_WIN_POS_CENTER_ALWAYS,
	GTK_WIN_POS_CENTER_ON_PARENT
} GtkWindowPosition;
GtkWidget* gtk_window_new(GtkWindowType);
void gtk_window_set_title(GtkWindow*, const gchar*);
const gchar* gtk_window_get_title(GtkWindow*);
void gtk_window_set_wmclass(GtkWindow*, const gchar* name, const gchar* class);
void gtk_window_set_icon_name(GtkWindow*, const gchar*);
gboolean gtk_window_set_icon_from_file(GtkWindow*, const gchar*, GError**);
void gtk_window_set_position(GtkWindow*, GtkWindowPosition);
void gtk_window_set_modal(GtkWindow*, gboolean);
gboolean gtk_window_get_modal(GtkWindow*);
void gtk_window_set_transient_for(GtkWindow*, GtkWindow* parent);
GtkWindow *gtk_window_get_transient_for(GtkWindow *);

// gtkwidget.h

void gtk_widget_destroy(GtkWidget*);
void gtk_widget_unparent(GtkWidget*);
void gtk_widget_show(GtkWidget*);
void gtk_widget_hide(GtkWidget*);
void gtk_widget_show_now(GtkWidget*);
void gtk_widget_show_all(GtkWidget*);
void gtk_widget_map(GtkWidget*);
void gtk_widget_unmap(GtkWidget*);
void gtk_widget_realize(GtkWidget*);
void gtk_widget_unrealize(GtkWidget*);

// gtkcontainer.h

typedef struct _GtkContainer GtkContainer;
void gtk_container_add(GtkContainer*, GtkWidget*);
void gtk_container_remove(GtkContainer*, GtkWidget*);

// gtkdialog.h

typedef struct _GtkDialog GtkDialog;
typedef enum {
	GTK_DIALOG_MODAL = 1 << 0,
	GTK_DIALOG_DESTROY_WITH_PARENT = 1 << 1,
	GTK_DIALOG_USE_HEADER_BAR = 1 << 2,
} GtkDialogFlags;
typedef enum {
	GTK_RESPONSE_NONE = -1,
	GTK_RESPONSE_REJECT = -2,
	GTK_RESPONSE_ACCEPT = -3,
	GTK_RESPONSE_DELETE_EVENT = -4,
	GTK_RESPONSE_OK = -5,
	GTK_RESPONSE_CANCEL = -6,
	GTK_RESPONSE_CLOSE = -7,
	GTK_RESPONSE_YES = -8,
	GTK_RESPONSE_NO = -9,
	GTK_RESPONSE_APPLY = -10,
	GTK_RESPONSE_HELP = -11,
} GtkResponseType;
gint gtk_dialog_run(GtkDialog*);

// gtkfilefilter.h

typedef struct _GtkFileFilter GtkFileFilter;
typedef enum {
	GTK_FILE_FILTER_FILENAME = 1 << 0,
	GTK_FILE_FILTER_URI = 1 << 1,
	GTK_FILE_FILTER_DISPLAY_NAME = 1 << 2,
	GTK_FILE_FILTER_MIME_TYPE = 1 << 3,
} GtkFileFilterFlags;
GtkFileFilter* gtk_file_filter_new();
void gtk_file_filter_set_name(GtkFileFilter*, const gchar* name);
const gchar* gtk_file_filter_get_name(GtkFileFilter*);
void gtk_file_filter_add_mime_type(GtkFileFilter*, const gchar* mime_type);
void gtk_file_filter_add_pattern(GtkFileFilter*, const gchar* pattern);
void gtk_file_filter_add_pixbuf_formats(GtkFileFilter*);

// gtkfilechooser.h

typedef struct _GtkFileChooser GtkFileChooser;
typedef enum {
	GTK_FILE_CHOOSER_ACTION_OPEN,
	GTK_FILE_CHOOSER_ACTION_SAVE,
	GTK_FILE_CHOOSER_ACTION_SELECT_FOLDER,
	GTK_FILE_CHOOSER_ACTION_CREATE_FOLDER
} GtkFileChooserAction;
typedef enum {
	GTK_FILE_CHOOSER_CONFIRMATION_CONFIRM,
	GTK_FILE_CHOOSER_CONFIRMATION_ACCEPT_FILENAME,
	GTK_FILE_CHOOSER_CONFIRMATION_SELECT_AGAIN
} GtkFileChooserConfirmation;
void gtk_file_chooser_set_local_only(GtkFileChooser*, gboolean);
gboolean gtk_file_chooser_get_local_only(GtkFileChooser*);
void gtk_file_chooser_set_select_multiple(GtkFileChooser*, gboolean);
gboolean gtk_file_chooser_get_select_multiple(GtkFileChooser*);
void gtk_file_chooser_set_show_hidden(GtkFileChooser*, gboolean);
gboolean gtk_file_chooser_get_show_hidden(GtkFileChooser*);
void gtk_file_chooser_set_do_overwrite_confirmation(GtkFileChooser*, gboolean);
gboolean gtk_file_chooser_get_do_overwrite_confirmation(GtkFileChooser*);
void gtk_file_chooser_set_create_folders(GtkFileChooser*, gboolean);
gboolean gtk_file_chooser_get_create_folders(GtkFileChooser*);
void gtk_file_chooser_set_current_name(GtkFileChooser*, const gchar* name);
gchar* gtk_file_chooser_get_current_name(GtkFileChooser*);
gchar* gtk_file_chooser_get_filename(GtkFileChooser*);
gboolean gtk_file_chooser_set_filename(GtkFileChooser*, const char*);
gboolean gtk_file_chooser_select_filename(GtkFileChooser*, const char*);
void gtk_file_chooser_unselect_filename(GtkFileChooser*, const char*);
void gtk_file_chooser_select_all(GtkFileChooser*);
void gtk_file_chooser_unselect_all(GtkFileChooser*);
gboolean gtk_file_chooser_set_current_folder(GtkFileChooser*, const gchar*);
gchar* gtk_file_chooser_get_current_folder(GtkFileChooser*);
void gtk_file_chooser_add_filter(GtkFileChooser*, GtkFileFilter*);
void gtk_file_chooser_remove_filter(GtkFileChooser*, GtkFileFilter*);
void gtk_file_chooser_set_filter(GtkFileChooser*, GtkFileFilter*);
GtkFileFilter* gtk_file_chooser_get_filter(GtkFileChooser*);

// gtkfilechooserwidget.h

GtkWidget* gtk_file_chooser_widget_new(GtkFileChooserAction);

// gtkfilechooserdialog.h

typedef struct _GtkFileChooserDialog GtkFileChooserDialog;
GtkWidget* gtk_file_chooser_dialog_new(const gchar* title,
	GtkWindow *parent, GtkFileChooserAction,
	const gchar *first_button_text, ...);
]]

local C, cast = ffi.C, ffi.cast
local G = ffi.load'gtk-3'

-- G.g_log_set_default_handler(function(domain, level, message, userdata)
-- 	require'ut'.run('zenity --info --text='..ffi.string(message))
-- end, nil)
G.g_log_set_default_handler(function() end, nil)
G.gtk_init(nil, nil)

local dirnames = {
	['<applications>'] = '/usr/bin',
	['<icons>'] = '/usr/share/icons',
}
local typenames = {
	['<all>'] = 'All Files',
	['<application>'] = 'Applications',
	['<image>'] = 'Image Files',
	['<icon>'] = 'Icon Files',
	['<audio>'] = 'Audio Files',
	['<video>'] = 'Video Files',
	['<font>'] = 'Font Files',
	['<text>'] = 'Text Files',
}
local typemimes = {
	['<application>'] = 'application/*',
	['<image>'] = 'image/*',
	['<icon>'] = 'image/*',
	['<audio>'] = 'audio/*',
	['<video>'] = 'video/*',
	['<font>'] = 'font/*',
	['<text>'] = 'text/*',
}
local function rundialog(o, action)
	jit.off(true, true)
	local win = G.gtk_window_new(C.GTK_WINDOW_TOPLEVEL)
	local dlg = G.gtk_file_chooser_dialog_new(o.title, nil, action,
		'gtk-cancel', cast('gint', C.GTK_RESPONSE_CANCEL),
		action == C.GTK_FILE_CHOOSER_ACTION_SAVE and 'gtk-save' or 'gtk-ok',
		cast('gint', C.GTK_RESPONSE_ACCEPT), nil)
	G.gtk_window_set_transient_for(cast('GtkWindow*', dlg), cast('GtkWindow*', win))
	G.gtk_window_set_icon_from_file(cast('GtkWindow*', dlg), 'yt2p.png', nil)
	local fc = cast('GtkFileChooser*', dlg)
	if action == C.GTK_FILE_CHOOSER_ACTION_SAVE then
		G.gtk_file_chooser_set_do_overwrite_confirmation(fc, true)
	end
	if o.dir then
		G.gtk_file_chooser_set_current_folder(fc, dirnames[o.dir] or o.dir)
	end
	if o.filters then
		for _, v in ipairs(o.filters) do
			local ff = G.gtk_file_filter_new()
			G.gtk_file_filter_set_name(ff, typenames[v] or v.name)
			if typemimes[v] then
				G.gtk_file_filter_add_mime_type(ff, typemimes[v])
			else
				G.gtk_file_filter_add_pattern(ff, v.pattern or '*')
			end
			G.gtk_file_chooser_add_filter(fc, ff)
			if v.selected then
				G.gtk_file_chooser_set_filter(fc, ff)
			end
		end
	end
	local res = false
	G.gtk_widget_show(dlg)
	G._connect_response(cast('GObject*', dlg), 'response', function(obj, id)
		if id == C.GTK_RESPONSE_ACCEPT then
			local p = G.gtk_file_chooser_get_filename(cast('GtkFileChooser*', obj))
			res = ffi.string(p)
			G.g_free(p)
		end
		G.gtk_widget_destroy(cast('GtkWidget*', obj))
		G.gtk_main_quit()
	end, nil, nil, 0)
	G.gtk_main()
	return res
end

function dialog.open(o)
	o = o or {}
	o.title = o.title or 'Open file'
	return rundialog(o, C.GTK_FILE_CHOOSER_ACTION_OPEN)
end

function dialog.save(o)
	o = o or {}
	o.title = o.title or 'Save file'
	return rundialog(o, C.GTK_FILE_CHOOSER_ACTION_SAVE)
end

function dialog.folder(o)
	o = o or {}
	o.title = o.title or 'Pick folder'
	return rundialog(o, C.GTK_FILE_CHOOSER_ACTION_SELECT_FOLDER)
end

return dialog
