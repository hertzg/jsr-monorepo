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

#ifndef __HB_EXPORT_H__
#define __HB_EXPORT_H__


// references
// https://www.blurb.com/blog/choosing-a-font-for-print-6-things-you-should-know/
// https://plumgroveinc.com/choosing-a-font-for-print-2/
// sans-serif: Helvetica / Arial
// serif: Times New Roman / Georgia or Garamond
// Title: sans-serif 18–24 pt
// Headings: sans-serif 14–18 pt
// Body text: serif 10–12 pt

#define	HB_PRINT_TITLE_POINT 18
#define	HB_PRINT_HEAD_POINT 15
#define	HB_PRINT_BODY_POINT 12
#define	HB_PRINT_FOOT_POINT 9

#define	HB_PRINT_LINE_HEIGHT 1.2

#define	HB_PRINT_SPACING 6

#define HB_PRINT_ALIGN_RIGHT 0
#define HB_PRINT_ALIGN_LEFT 1



typedef struct
_hbprintcontext
{
	gboolean	statement;

	gchar	*tabtext;
	gchar	*title;
	gchar	*subtitle;

	gchar	**lines;

	gint	header_height;

	gint	numpagerow;
	gint	numpagecol;
	gint	num_columns;
	
	gint	*col_width;
	gint8	*col_align;		//0 if right, 1 if left
	gint8	*leftcols;		//-1 terminated index of col left aligned

	gint	lines_per_page;
	gint	num_lines;
	gint	num_pages;
} HbPrintData;



void hb_export_qif_account_all(gchar *filename);
void hb_export_qif_account_single(gchar *filename, Account *acc);

void hb_print_listview(GtkWindow *parent, gchar *tabtext, gint8 *leftcols, gchar *title, gchar *subtitle, gchar *filepath, gboolean statement);

#endif

