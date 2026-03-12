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

#ifndef __HB_TAG_H__
#define __HB_TAG_H__


#include "hb-types.h"

struct _tag
{
	guint32   	key;
	gchar   	*name;

	/* unsaved datas */
	//gboolean	flt_select;
	guint16		nb_use_txn;
	guint16		nb_use_all;
	//guint		usage_count;
};


void da_tag_free(Tag *item);
Tag *da_tag_malloc(void);

void da_tag_destroy(void);
void da_tag_new(void);

guint		da_tag_length(void);
gboolean	da_tag_create_none(void);
gboolean	da_tag_delete(guint32 key);
gboolean	da_tag_insert(Tag *acc);
gboolean	da_tag_append(Tag *acc);
Tag *da_tag_append_if_new(gchar *rawname);
guint32		da_tag_get_max_key(void);
Tag		*da_tag_get_by_name(gchar *name);
Tag		*da_tag_get(guint32 key);
void da_tag_consistency(Tag *item);

gboolean tags_equal(guint32 *stags, guint32 *dtags);
guint tags_count(guint32 *tags);
guint32 *tags_clone(guint32 *tags);
guint32 *tags_parse(const gchar *tagstring);
gchar *tags_tostring(guint32 *tags);

gint tags_delete_unused(void);
void tags_fill_usage(void);
void tag_move(guint32 key1, guint32 key2);
gboolean tag_rename(Tag *item, const gchar *newname);

GList *tag_glist_sorted(gint column);

gboolean tag_load_csv(gchar *filename, gchar **error);
void tag_save_csv(gchar *filename);

#endif

