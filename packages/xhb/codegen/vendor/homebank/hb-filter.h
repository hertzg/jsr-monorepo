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

#ifndef __HB_FILTER_H__
#define __HB_FILTER_H__


/*
** filter options
*/

enum
{
	FLT_OFF,
	FLT_INCLUDE,
	FLT_EXCLUDE
};


enum
{
	FLT_GRP_DATE,
	FLT_GRP_CATEGORY,
	FLT_GRP_PAYEE,
	FLT_GRP_ACCOUNT,
	FLT_GRP_TAG,
	FLT_GRP_TEXT,
	FLT_GRP_AMOUNT,
	FLT_GRP_PAYMODE,
	FLT_GRP_STATUS,
	FLT_GRP_TYPE,
	FLT_GRP_MAX
};


enum
{
	OLD56_FLT_RANGE_THISMONTH    = 0,
	OLD56_FLT_RANGE_LASTMONTH    = 1,
	OLD56_FLT_RANGE_THISQUARTER  = 2,
	OLD56_FLT_RANGE_LASTQUARTER  = 3,
	OLD56_FLT_RANGE_THISYEAR     = 4,
	OLD56_FLT_RANGE_LASTYEAR     = 5,	 //was not existing on 4.5
	// 6 separator
	OLD56_FLT_RANGE_LAST30DAYS   = 7,
	OLD56_FLT_RANGE_LAST60DAYS   = 8,
	OLD56_FLT_RANGE_LAST90DAYS   = 9,
	OLD56_FLT_RANGE_LAST12MONTHS = 10,
	// 11 separator
	OLD56_FLT_RANGE_OTHER        = 12,
	// 13 separator
	OLD56_FLT_RANGE_ALLDATE      = 14
};


enum
{
	FLT_RANGE_UNSET = 0,
	FLT_RANGE_MISC_CUSTOM,
	FLT_RANGE_MISC_ALLDATE,
	FLT_RANGE_MISC_30DAYS,

	FLT_RANGE_LAST_DAY = 20,
	FLT_RANGE_LAST_WEEK,
	FLT_RANGE_LAST_FORTNIGHT,
	FLT_RANGE_LAST_MONTH,
	FLT_RANGE_LAST_QUARTER,
	FLT_RANGE_LAST_YEAR,
	FLT_RANGE_LAST_30DAYS,
	FLT_RANGE_LAST_60DAYS,
	FLT_RANGE_LAST_90DAYS,
	FLT_RANGE_LAST_12MONTHS,
	FLT_RANGE_LAST_6MONTHS,

	FLT_RANGE_THIS_DAY = 40,
	FLT_RANGE_THIS_WEEK,
	FLT_RANGE_THIS_FORTNIGHT,
	FLT_RANGE_THIS_MONTH,
	FLT_RANGE_THIS_QUARTER,
	FLT_RANGE_THIS_YEAR,

	FLT_RANGE_NEXT_DAY = 60,
	FLT_RANGE_NEXT_WEEK,
	FLT_RANGE_NEXT_FORTNIGHT,
	FLT_RANGE_NEXT_MONTH,
	FLT_RANGE_NEXT_QUARTER,
	FLT_RANGE_NEXT_YEAR,

	FLT_RANGE_TODATE_YEAR = 80,
	FLT_RANGE_TODATE_MONTH,
	FLT_RANGE_TODATE_ALL,

	FLT_RANGE_MAX
};




enum
{
	FLT_TYPE_ALL = 0,
	// 1 separator
	FLT_TYPE_EXPENSE = 2,
	FLT_TYPE_INCOME = 3,
	FLT_TYPE_INTXFER = 4,
	FLT_TYPE_NOTXFER = 5,
};


enum
{
	FLT_STATUS_ALL = 0,
	// 1 separator
	FLT_STATUS_CLEARED = 2,
	FLT_STATUS_UNCLEARED = 3,
	FLT_STATUS_RECONCILED = 4,
	FLT_STATUS_UNRECONCILED = 5,
	// 6 separator
	FLT_STATUS_UNCATEGORIZED = 7,
	//5.9
	FLT_STATUS_UNAPPROVED = 8,
};


enum
{
	FLT_QSEARCH_MEMO     = 1<<0,
	FLT_QSEARCH_NUMBER   = 1<<1,
	FLT_QSEARCH_PAYEE    = 1<<2,
	FLT_QSEARCH_CATEGORY = 1<<3,
	FLT_QSEARCH_TAGS     = 1<<4,
	FLT_QSEARCH_AMOUNT   = 1<<5
};


struct _filter
{
	guint32  	key;
	//gushort 	flags;
	gchar		*name;
	gshort		option[FLT_GRP_MAX];

	gint		range;
	guint32		mindate, maxdate;
	//gint		rawtype, rawstatus;
	//gboolean	typ_exp, typ_inc, typ_xfr;	//5.6
	gboolean	typ_nexp, typ_ninc, typ_xexp, typ_xinc;	//5.8
	gboolean	sta_non, sta_clr, sta_rec;	//5.6
	gboolean	paymode[NUM_PAYMODE_MAX];
	gdouble		minamount, maxamount;

	gboolean	exact;
	//pointer here
	gchar		*number;	//old info < 5.8
	gchar		*memo;

	GArray		*gbacc;
	GArray		*gbpay;
	GArray		*gbcat;
	GArray		*gbtag;

	/* unsaved datas */
	gshort		n_active;
	gshort		n_item[FLT_GRP_MAX];

	gint		type;		//register combobox type
	gint		status;
	gint		nbchanges;
	gint		nbdaysfuture;
	gboolean	forceadd;
	gboolean	forcechg;
	gboolean	forceremind;
	gboolean	forcevoid;
	gchar		last_tab[8];	/* keep last active tab */
};


Filter *da_flt_malloc(void);
void da_flt_free(Filter *flt);

void da_flt_copy(Filter *src, Filter *dst);
void da_flt_destroy(void);
void da_flt_new(void);

void da_flt_count_item(Filter *flt);

guint		da_flt_length(void);
gboolean	da_flt_create_none(void);
gboolean	da_flt_remove(guint32 key);
gboolean	da_flt_insert(Filter *item);
gboolean	da_flt_append(Filter *item);
guint32		da_flt_get_max_key(void);
Filter		*da_flt_get_by_name(gchar *name);
Filter		*da_flt_get_by_imp_name(gchar *name);
Filter		*da_flt_get(guint32 key);
void da_flt_consistency(Filter *item);

guint da_flt_status_acc_set(Filter *flt, guint32 kacc, gboolean status);
guint da_flt_status_pay_set(Filter *flt, guint32 kpay, gboolean status);
guint da_flt_status_cat_set(Filter *flt, guint32 kcat, gboolean status);
guint da_flt_status_tag_set(Filter *flt, guint32 ktag, gboolean status);
gboolean da_flt_status_acc_get(Filter *flt, guint32 kacc);
gboolean da_flt_status_pay_get(Filter *flt, guint32 kpay);
gboolean da_flt_status_cat_get(Filter *flt, guint32 kcat);
gboolean da_flt_status_tag_get(Filter *flt, guint32 ktag);

GList *filter_glist_sorted(gint column);

void filter_status_acc_clear_except(Filter *flt, guint32 selkey);
void filter_status_pay_clear_except(Filter *flt, guint32 selkey);
void filter_status_cat_clear_except(Filter *flt, guint32 selkey);

void filter_reset(Filter *flt);
void filter_preset_daterange_set(Filter *flt, gint range, guint32 kacc);
void filter_preset_type_set(Filter *flt, gint type, gint mode);

gboolean filter_preset_daterange_future_enable(Filter *flt, gint range);

guint32 filter_get_maxdate_forecast(Filter *filter);
void filter_preset_daterange_add_futuregap(Filter *filter, gboolean usrfuture);

void filter_set_tag_by_id(Filter *flt, guint32 key);
void filter_preset_status_set(Filter *flt, gint value);


gchar *filter_daterange_text_get(Filter *flt);
gchar *filter_text_summary_get(Filter *flt);


gboolean filter_txn_search_match(gchar *needle, Transaction *txn, gint flags);
gboolean filter_tpl_search_match(gchar *needle, Archive *arc);

gint filter_acc_match(Filter *flt, Account *acc);
gint filter_txn_match(Filter *flt, Transaction *ope);

#endif
