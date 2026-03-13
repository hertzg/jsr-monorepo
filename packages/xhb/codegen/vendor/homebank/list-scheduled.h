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

#ifndef __LIST_SCHEDULED__H__
#define __LIST_SCHEDULED__H__


enum
{
	LIST_SCH_TYPE_MANAGE = 0,
	LIST_SCH_TYPE_DISPLAY
};


enum
{
	LST_DSPUPC_DATAS,	//shared
	LST_DSPUPC_NEXT,
	LST_DSPUPC_MEMO,
	LST_DSPUPC_EXPENSE,
	LST_DSPUPC_INCOME,
	LST_DSPUPC_NB_LATE,
	NUM_LST_DSPUPC
};

// UID are used to save column position
enum
{
	COL_SCH_UID_LATE = 1,
	COL_SCH_UID_STILL,
	COL_SCH_UID_GRPFLAG,
	//-- last fixed
	COL_SCH_UID_NEXTDATE = 9,
	//-- allow reorder start here --
	COL_SCH_UID_PAYNUMBER = 10,
	COL_SCH_UID_PAYEE,
	COL_SCH_UID_CATEGORY,
	COL_SCH_UID_CLR,
	COL_SCH_UID_AMOUNT,
	COL_SCH_UID_EXPENSE,
	COL_SCH_UID_INCOME,
	COL_SCH_UID_MEMO,
	COL_SCH_UID_ACCOUNT
};
//from 10 to 18
#define NUM_COL_SCH_UID 9


struct lst_sch_data
{
	GtkWidget	*treeview;
	GtkWidget	*menu;
};


gchar *ui_arc_listview_get_freq_label(gint index);

void ui_arc_listview_widget_columns_order_load(GtkTreeView *treeview);
void ui_arc_listview_widget_columns_order_save(GtkTreeView *treeview);

GString *lst_sch_widget_to_string(GtkTreeView *treeview, ToStringMode mode);

GtkWidget *lst_sch_widget_new(gint listtype);
GtkWidget *ui_arc_listview_widget_new(void);


#endif
