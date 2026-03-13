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

#ifndef __HB_PAYEE_H__
#define __HB_PAYEE_H__

#include "hb-types.h"

struct _payee
{
	guint32   	key;
	gushort		paymode;
	gushort 	flags;		//_pad1 prior 5.6
	guint32		kcat;
	gchar   	*name;
	gchar	    *notes;		//added 5.6

	/* unsaved datas */
	//gboolean	flt_select;
	guint16		nb_use_txn;
	guint16		nb_use_all;
};

#define PF_HIDDEN	(1<<8)	//hidden by user


void da_pay_free(Payee *item);
Payee *da_pay_malloc(void);

void da_pay_destroy(void);
void da_pay_new(void);

guint da_pay_length(void);
guint32 da_pay_get_max_key(void);

gboolean da_pay_delete(guint32 key);
gboolean da_pay_insert(Payee *acc);
gboolean da_pay_append(Payee *acc);
Payee *da_pay_append_if_new(gchar *rawname);

Payee *da_pay_get(guint32 key);
gchar *da_pay_get_name(Payee *item);
Payee *da_pay_get_by_name(gchar *rawname);

void da_pay_consistency(Payee *item);

gint payee_delete_unused(void);
void payee_fill_usage(void);

GList *payee_glist_sorted(gint column);

void payee_move(guint32 key1, guint32 key2);
gboolean payee_rename(Payee *item, const gchar *newname);

gboolean payee_load_csv(gchar *filename, gchar **error);
void payee_save_csv(gchar *filename);

#endif
