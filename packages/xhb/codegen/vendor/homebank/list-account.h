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

#ifndef __LIST_ACCOUNT__H__
#define __LIST_ACCOUNT__H__


enum
{
	DSPACC_GROUP_BY_TYPE,
	DSPACC_GROUP_BY_BANK,
	DSPACC_GROUP_BY_GROUP
};


/* lst acc datatype */
enum
{
	DSPACC_TYPE_NORMAL,
	DSPACC_TYPE_HEADER,
	DSPACC_TYPE_SUBTOTAL,
	DSPACC_TYPE_TOTAL
};


/* list display account */
enum
{
	LST_DSPACC_DATATYPE,
	LST_DSPACC_POS,	
	LST_DSPACC_DATAS,
	NUM_LST_DSPACC
};

enum
{
	COL_DSPACC_STATUS,
	COL_DSPACC_ACCOUNTS,
	COL_DSPACC_RECON,
	COL_DSPACC_CLEAR,
	COL_DSPACC_TODAY,
	COL_DSPACC_FUTURE,
	NUM_LST_COL_DSPACC
};


enum {
	LST_TXN_ACC_REC = 1 << 0,	//detail/print
	LST_TXN_ACC_CLR = 1 << 1,	//!print
	LST_TXN_ACC_TOD = 1 << 2,	
	LST_TXN_ACC_FUT = 1 << 3,
};


struct lst_accview_data
{
	GtkWidget	*treeview;
	GtkWidget	*menu;
};


GString *lst_accview_to_string(GtkTreeView *treeview, ToStringMode mode);

gboolean list_account_level1_expanded(GtkTreeView *treeview, gchar *name);

GtkWidget *lst_accview_new(void);


#endif
