/*  HomeBank -- Free, easy, personal accounting for everyone.
 *  Copyright (C) 1995-2026 Maxime DOYEN
 *
 *  This file is part of HomeBank.
 *
 *  HomeBank is free software; you can redistribute it and/or modify
 *  it under the terms of the GNU General Public License as published by
 *  the Free Software Foundation; either version 2 of the License, or
 *  (at your option) any later version.
 *
 *  HomeBank is distributed in the hope that it will be useful,
 *  but WITHOUT ANY WARRANTY; without even the implied warranty of
 *  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *  GNU General Public License for more details.
 *
 *  You should have received a copy of the GNU General Public License
 *  along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

#ifndef __HOMEBANK_H__
#define __HOMEBANK_H__

#ifdef HAVE_CONFIG_H
#include <config.h>
#endif


#include <errno.h>
#include <math.h>		/* floor */
#include <libintl.h>	/* gettext */
#include <locale.h>
#include <stdlib.h>		/* atoi, atof, atol */
#include <string.h>		/* memset, memcpy, strcasestr, strcmp, strcpy */
//#include <time.h>

#include <glib.h>
#include <glib/gstdio.h>
#include <gtk/gtk.h>


#include "hb-types.h"
#include "enums.h"

#include "icon-names.h"
#include "hb-preferences.h"

#include "hb-account.h"
#include "hb-archive.h"
#include "hb-assign.h"
#include "hb-category.h"
#include "hb-filter.h"
#include "hb-payee.h"
#include "hb-tag.h"
#include "hb-transaction.h"

#include "hb-currency.h"
#include "hb-encoding.h"
#include "hb-export.h"
#include "hb-group.h"
#include "hb-hbfile.h"
#include "hb-import.h"
#include "hb-misc.h"
#include "hb-report.h"


#define _(str) gettext (str)
#define gettext_noop(str) (str)
#define N_(str) gettext_noop (str)


/* = = = = = = = = = = = = = = = = */


#define HB_PRIV_FUNC		FALSE
#define HB_PRIV_FORCE_ENUS	FALSE


#define HB_UNSTABLE			FALSE
#define HB_UNSTABLE_SHOW	FALSE	//show user RC header


#define HOMEBANK_MAJOR	5
#define HOMEBANK_MINOR	10
#define HOMEBANK_MICRO	0

#define HB_VERSION		"5.10"
#define HB_VERSION_NUM	(HOMEBANK_MAJOR*10000) + (HOMEBANK_MINOR*100) + HOMEBANK_MICRO

#define FILE_VERSION		1.6


#if HB_UNSTABLE == FALSE
	#define	PROGNAME		"HomeBank"
	#define HB_DATA_PATH	"homebank"
#else
	#define	PROGNAME		"HomeBank " HB_VERSION " (unstable)"
	#define HB_DATA_PATH	"homebank_unstable"
#endif


#ifdef G_OS_WIN32
	#define GETTEXT_PACKAGE "homebank"
	#define LOCALE_DIR      "locale"
	#define PIXMAPS_DIR     "images"
	#define HELP_DIR        "help"
	#define PACKAGE_VERSION HB_VERSION
	#define PACKAGE         "homebank"
	#define VERSION         HB_VERSION

	//#define PORTABLE_APP
	//#define NOOFX

	#define ENABLE_NLS 1
#endif


/* container spacing */
#define SPACING_TINY		3
#define SPACING_SMALL		6
#define SPACING_MEDIUM		12
#define SPACING_LARGE		18
#define SPACING_POPOVER		10


#define HB_DATE_MAX_GAP	7

// those 2 line are duplicated into dateentry
#define HB_MINDATE  693596	  //01/01/1900
#define HB_MAXDATE  803533	  //31/12/2200

/* widget minimum width */
#define HB_MINWIDTH_LIST	161
#define HB_MINHEIGHT_LIST	260

#define HB_MINWIDTH_SEARCH	240
#define HB_MINWIDTH_COLUMN  48


/* miscellaneous */
#define PHI 1.61803399



#define HB_NUMBER_SAMPLE	1234567.89

/* hbfile/account/import update flags */
enum
{
	UF_TITLE     	= 1 << 0,	//1
	UF_SENSITIVE 	= 1 << 1,	//2
	UF_VISUAL   	= 1 << 2,	//4
	UF_REFRESHALL   = 1 << 3,	//8
	UF_TXNLIST		= 1 << 4,	//16
	//				= 1 << 5
};



typedef enum
{
	FILETYPE_UNKNOWN,
	FILETYPE_HOMEBANK,
	FILETYPE_OFX,
	FILETYPE_QIF,
	FILETYPE_CSV_HB,
//	FILETYPE_AMIGA_HB,
	NUM_FILETYPE
} HbFileType;


/* ---- icon size as defined into gtkiconfactory.c ---- */
/* GTK_ICON_SIZE_MENU 16
 * GTK_ICON_SIZE_BUTTON 20
 * GTK_ICON_SIZE_SMALL_TOOLBAR 18
 * GTK_ICON_SIZE_LARGE_TOOLBAR 24 (default for toolbar)
 * GTK_ICON_SIZE_DND 32
 * GTK_ICON_SIZE_DIALOG 48
 */


/*
** Global application datas
*/
struct HomeBank
{
	// hbfile storage
	GHashTable		*h_cur;			//currencies
	GHashTable		*h_grp;			//groups

	GHashTable		*h_acc;			//accounts
	GHashTable		*h_pay;			//payees
	GHashTable		*h_cat;			//categories

	GHashTable		*h_rul;			//assign rules
	GHashTable		*h_tag;			//tags
	GHashTable		*h_flt;			//filters
	GtkListStore	*fltmodel;

	GHashTable		*h_memo;		//memo/description

	GList			*arc_list;		//scheduled/template

	//#1419304 we keep the deleted txn to a stack trash
	//GTrashStack		*txn_stk;
	GSList			*openwindows;	//added 5.5.1
	GSList			*deltxn_list;

	// hbfile (wallet saved properties)
	gchar			*owner;
	gshort			auto_smode;
	gshort			auto_weekday;
	gshort			auto_nbmonths;
	gshort			auto_nbdays;
	gdouble			lifen_earnbyh;

	guint32			vehicle_category;
	guint32			kcur;			// base currency

	// hbfile (unsaved properties)
	guint			changes_count;
	gboolean		hbfile_is_new;
	gboolean		hbfile_is_bak;
	gchar			*xhb_filepath;
	gboolean		xhb_hasrevert;		//file has backup (*.xhb~) used for revert menu sensitivity
	guint64			xhb_timemodified;
	gboolean		xhb_obsoletecurr;

	// really global stuffs
	gboolean		first_run;
	guint32			today;			//today's date
	gint			define_off;		//>0 when a stat, account window is opened
	gboolean		minor;

	GtkApplication  *application;	
	GtkWidget		*mainwindow;	//should be global to access attached window data

	GtkCssProvider	*provider;
	GtkIconTheme	*icontheme;
	//GdkPixbuf		*lst_pixbuf[NUM_LST_PIXBUF];
	//gint			lst_pixbuf_maxwidth;
	
	GDBusProxy		*settings_portal;
	ColorScheme		color_scheme;
	gboolean		theme_is_dark;

};


gchar *homebank_filepath_with_extention(gchar *path, gchar *extension);
gchar *homebank_filename_without_extention(gchar *path);
void homebank_file_ensure_xhb(gchar *filename);
void homebank_backup_current_file(void);
gboolean homebank_util_url_show (const gchar *url);
gchar *homebank_lastopenedfiles_load(void);
gboolean homebank_lastopenedfiles_save(void);


void homebank_window_set_icon_from_file(GtkWindow *window, gchar *filename);

const gchar *homebank_app_get_config_dir (void);
const gchar *homebank_app_get_images_dir (void);
const gchar *homebank_app_get_pixmaps_dir (void);
const gchar *homebank_app_get_locale_dir (void);
const gchar *homebank_app_get_help_dir (void);
const gchar *homebank_app_get_datas_dir (void);
guint32 homebank_app_date_get_julian(void);

GtkWindow *homebank_app_find_window(gint needle_key);

/* - - - - obsolete/future things - - - - */

/*
typedef struct _budget		Budget;

struct _budget
{
	guint	key;
	gushort	flags;
	guint	cat_key;
	guint	year;
	gdouble	value[13];
};
*/

/*
struct _investment
{
	guint	date;
	gdouble	buy_amount;
	gdouble	curr_amount;
	gdouble	commission;
	guint	number;
	guint	account;
	gchar	*name;
	gchar	*symbol;
	gchar	*note;
};
*/

#endif
