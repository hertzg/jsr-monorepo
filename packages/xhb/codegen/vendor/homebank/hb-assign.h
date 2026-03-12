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

#ifndef __HB_ASSIGN_H__
#define __HB_ASSIGN_H__


#include "hb-types.h"


struct _assign
{
	guint32   	key;
	gushort		flags;
	gushort		field;		//0:memo / 1:payee
	gchar   	*search;
	gchar		*notes;
	guint32		kpay;		//dst payee
	guint32		kcat;		//dst category
	gushort		paymode;	//dst_payment mode
	guint32		pos;		//position
	gdouble		amount;		//5.6 #1710085 assignment based on amount
	guint32		*tags;		//5.8 #1674016
};


#define ASGF_EXACT	(1<<0)
#define ASGF_DOPAY	(1<<1)
#define ASGF_DOCAT	(1<<2)
#define ASGF_DOMOD	(1<<3)
#define ASGF_DOTAG	(1<<4) //5.8

#define ASGF_PREFILLED	(1<<5)

#define ASGF_AMOUNT	(1<<7)	//5.6
#define ASGF_REGEX	(1<<8)
#define ASGF_OVWPAY	(1<<9)
#define ASGF_OVWCAT	(1<<10)
#define ASGF_OVWMOD	(1<<11)
#define ASGF_OVWTAG (1<<12) //5.8


void
da_asg_free(Assign *item);
Assign *da_asg_malloc(void);

void da_asg_destroy(void);
void da_asg_new(void);

guint		da_asg_length(void);
gboolean	da_asg_create_none(void);
gboolean	da_asg_remove(guint32 key);
gboolean	da_asg_insert(Assign *asg);
gboolean	da_asg_append(Assign *asg);
Assign *da_asg_duplicate(Assign *srcitem);
guint32		da_asg_get_max_key(void);
Assign		*da_asg_get_by_name(gchar *name);
Assign		*da_asg_get(guint32 key);
void da_asg_consistency(Assign *item);
Assign *da_asg_init_from_transaction(Assign *asg, Transaction *txn);
void da_asg_update_position(void);

gchar *assign_get_target_payee(Assign *asgitem);
gchar *assign_get_target_category(Assign *asgitem);

GList *assign_glist_sorted(gint column);

guint transaction_auto_assign(GList *ope_list, guint32 key, gboolean lockrecon);

#endif

