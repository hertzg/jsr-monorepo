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

#ifndef __HB_CATEGORY_H__
#define __HB_CATEGORY_H__


#include "hb-types.h"


struct _category
{
	guint32		key;
	guint32		parent;
	gushort		flags;
	gushort		_pad1;
	gchar		*name;
	gdouble		budget[13];	//0:is same value, 1 ..12 are months

	/* unsaved datas */
	gchar		*fullname;
	gchar		*typename;
	//gboolean	flt_select;
	guint16		nb_use_txn;
	guint16		nb_use_txncat;	//cat usage only
	guint16		nb_use_all;
	guint16		nb_use_allcat;	//cat usage only
};

#define GF_SUB		(1<<0)		//? useful as we can check item->parent= 0
#define GF_INCOME	(1<<1)
#define GF_CUSTOM	(1<<2)
#define GF_BUDGET	(1<<3)
#define GF_FORCED	(1<<4)
#define GF_MIXED	(1<<5)		//#1740368 if cat has mixed exp/inc type

#define GF_HIDDEN	(1<<8)		//hidden by user


Category *da_cat_clone(Category *src_item);
void da_cat_free(Category *item);
Category *da_cat_malloc(void);

void da_cat_destroy(void);
void da_cat_new(void);

guint da_cat_length(void);
guint32 da_cat_get_max_key(void);

guint32 da_cat_delete(guint32 key);
gboolean da_cat_insert(Category *acc);
gboolean da_cat_append(Category *cat);
Category *da_cat_append_ifnew_by_fullname(gchar *rawfullname);

Category *da_cat_get(guint32 key);
gchar *da_cat_get_name(Category *item);
gchar *da_cat_get_fullname(Category *item);
Category *da_cat_get_by_fullname(gchar *rawfullname);

void da_cat_consistency(Category *item);
void da_cat_anonymize(Category *item);


GList *category_glist_sorted(gint column);

gboolean category_key_budget_active(guint32 key);
gboolean category_key_unbudgeted(guint32 key);
guint32 category_report_id(guint32 key, gboolean subcat);

gint category_delete_unused(void);
void category_fill_usage(void);

void category_move(guint32 srckey, guint32 newkey, gboolean dosubcat);
gboolean category_rename(Category *item, const gchar *newname);

gchar *category_find_preset(gchar **lang);
gint category_type_get(Category *item);
gint category_root_type_get(guint32 key);
gchar category_get_type_char(Category *item);
gint category_change_type(Category *item, gboolean isIncome, gboolean doChild);

gboolean category_load_csv(gchar *filename, gchar **error);
gboolean category_save_csv(gchar *filename, gchar **error);

#endif
