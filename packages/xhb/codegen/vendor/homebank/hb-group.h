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

#ifndef __HB_GROUP_H__
#define __HB_GROUP_H__


typedef struct _group	Group;

struct _group
{
	guint32   	key;
	//gushort		flags;
	//gushort		type;
	gchar   	*name;
};


/*typedef enum
{
	GRP_TYPE_ACC = 1,
	//GRP_TYPE_PAY
	//GRP_TYPE_CAT
} HbGroupType;
*/


void da_grp_free(Group *item);
Group *da_grp_malloc(void);

void da_grp_destroy(void);
void da_grp_new(void);

guint		da_grp_length(void);
gboolean	da_grp_create_none(void);
gboolean	da_grp_remove(guint32 key);
gboolean	da_grp_insert(Group *item);
gboolean	da_grp_append(Group *item);
guint32		da_grp_get_max_key(void);
Group		*da_grp_get_by_name(gchar *name);
Group		*da_grp_get_by_imp_name(gchar *name);
Group		*da_grp_get(guint32 key);

void group_delete_unused(void);
GList *group_glist_sorted(gint column);

#endif