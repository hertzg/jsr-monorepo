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

#ifndef __HB_ARCHIVE_H__
#define __HB_ARCHIVE_H__

#include "hb-types.h"


struct _archive
{
	guint32		key;

	gdouble		amount;
	guint32		kacc;
	guchar		paymode;
	guchar		grpflg;
	gushort		flags;
	guint32		kpay;
	guint32		kcat;
	gchar		*memo;

	//guint32		date;
	//gushort		pos;
	gushort     status;
	gchar		*number;	//info < 5.8
	guint32		*tags;
	//guint32		kxfer;		//strong link xfer key
	guint32		kxferacc;
	gdouble		xferamount;	//xfer target alount
	
	GPtrArray	*splits;

	//recurrence :: https://learn.microsoft.com/en-us/graph/outlook-schedule-recurring-events
	gushort		rec_flags;		//flags
	guchar		rec_freq;		//0-3
	guchar		rec_every;		//100
	guchar		rec_ordinal;	//0-5
	guchar		rec_weekday;	//1-10
	guint32		nextdate;
	guchar		daygap;
	guchar		weekend;	//0 - 3
	gushort		limit;		//366	

	/* unsaved datas */
	gushort		dspflags;
};


// saved flags -- data
//gushort is 2 bytes / 16 bits
#define TF_RECUR	(1<< 0)
#define TF_LIMIT	(1<< 1)
#define TF_RELATIVE	(1<< 2)


enum
{
	ARC_POSTMODE_DUEDATE,
	ARC_POSTMODE_PAYOUT,
	ARC_POSTMODE_ADVANCE
};


/*
** scheduled unit
*/
enum {
	AUTO_FREQ_DAY,
	AUTO_FREQ_WEEK,
	AUTO_FREQ_MONTH,
	//AUTO_UNIT_QUARTER,
	AUTO_FREQ_YEAR
};

//5.9
enum {
	AUTO_ORDINAL_FIRST = 1,
	AUTO_ORDINAL_SECOND,
	AUTO_ORDINAL_THIRD,
	AUTO_ORDINAL_FOURTH,
	AUTO_ORDINAL_LAST,
};

//5.9
enum {
	AUTO_WEEKDAY_MONDAY = 1,
	AUTO_WEEKDAY_TUESDAY,
	AUTO_WEEKDAY_WEDNESDAY,
	AUTO_WEEKDAY_THURSDAY,
	AUTO_WEEKDAY_FRIDAY,
	AUTO_WEEKDAY_SATURDAY,
	AUTO_WEEKDAY_SUNDAY,
	//----
	AUTO_WEEKDAY_DAY,
	AUTO_WEEKDAY_WEEKDAY,
	AUTO_WEEKDAY_WEEKENDDAY,
};


enum {
	ARC_WEEKEND_POSSIBLE,
	ARC_WEEKEND_BEFORE,
	ARC_WEEKEND_AFTER,
	ARC_WEEKEND_SKIP
};


enum
{
	FLT_SCHEDULED_THISMONTH = 1,
	FLT_SCHEDULED_NEXTMONTH,
	FLT_SCHEDULED_NEXT30DAYS,
	FLT_SCHEDULED_NEXT60DAYS,
	FLT_SCHEDULED_NEXT90DAYS,
	FLT_SCHEDULED_ALLDATE,
	//added 5.7
	FLT_SCHEDULED_MAXPOSTDATE
};



Archive *da_archive_malloc(void);
Archive *da_archive_clone(Archive *src_item);
guint archive_add_get_nbdays(void);
void da_archive_free(Archive *item);
void da_archive_destroy(GList *list);


guint da_archive_length(void);
void da_archive_stats(gint *nbtpl, gint *nbsch);
gboolean da_archive_append(Archive *item);
gboolean da_archive_append_new(Archive *item);
guint32 da_archive_get_max_key(void);
Archive *da_archive_get(guint32 key);


void da_archive_get_display_label(GString *tpltitle, Archive *item);
void da_archive_consistency(Archive *item);

Archive *da_archive_init_from_transaction(Archive *arc, Transaction *txn, gboolean fromledger);

GList *da_archive_glist_sorted(gint column);

gboolean template_is_account_used(Archive *arc);

void scheduled_nextdate_weekend_adjust(Archive *arc);
guint32 scheduled_date_get_next_post(GDate *date, Archive *arc, guint32 nextdate);
guint32 scheduled_date_get_next_relative(GDate *date, guint ordinal, guint weekday, guint every);

gboolean scheduled_is_postable(Archive *arc);
guint32 scheduled_get_txn_real_postdate(guint32 postdate, gint weekend);
guint32 scheduled_get_latepost_count(GDate *date, Archive *arc, guint32 jrefdate);
guint32 scheduled_date_advance(Archive *arc);

void scheduled_date_get_show_minmax(gint select, guint32 *mindate, guint32 *maxdate);

guint32 scheduled_date_get_post_max(guint32 start, gint auto_smode, gint auto_nbdays, gint auto_weekday, gint nbmonth);
gint scheduled_post_all_pending(void);


#endif

