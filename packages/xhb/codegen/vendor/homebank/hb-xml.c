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


#include "homebank.h"

#include "hb-transaction.h"
#include "hb-xml.h"

#include "ui-dialogs.h"

/****************************************************************************/
/* Debug macros                                                             */
/****************************************************************************/
#define MYDEBUG 0

#if MYDEBUG
#define DB(x) (x);
#else
#define DB(x);
#endif

/* our global datas */
extern struct HomeBank *GLOBALS;
extern struct Preferences *PREFS;


/* = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = */


// v0.1 to v0.2 : we must change account reference by making a +1 to its index references
static void homebank_upgrade_to_v02(void)
{
GList *lst_acc, *lnk_acc;
GList *list;
GHashTable *h_old_acc;
	

	DB( g_print("\n[hb-xml] homebank_upgrade_to_v02\n") );

	//keep old hashtable with us
	h_old_acc = GLOBALS->h_acc;
	da_acc_new();

	lst_acc = g_hash_table_get_values(h_old_acc);
	lnk_acc = g_list_first(lst_acc);
	while (lnk_acc != NULL)
	{
	Account *acc = lnk_acc->data;

		acc->key++;
		acc->pos++;
		da_acc_insert (acc);

		list = g_queue_peek_head_link(acc->txn_queue);
		while (list != NULL)
		{
		Transaction *entry = list->data;
			entry->kacc++;
			entry->kxferacc++;
			list = g_list_next(list);
		}
		lnk_acc = g_list_next(lnk_acc);
	}
	g_list_free(lst_acc);

	//we loose some small memory here
	g_hash_table_steal_all(h_old_acc);

	list = g_list_first(GLOBALS->arc_list);
	while (list != NULL)
	{
	Archive *entry = list->data;
		entry->kacc++;
		entry->kxferacc++;
		list = g_list_next(list);
	}
}

// v0.2 to v0.3 : we must assume categories exists : bugs 303886, 303738
static void homebank_upgrade_to_v03(void)
{
GList *lst_acc, *lnk_acc;
GList *list;

	DB( g_print("\n[hb-xml] homebank_upgrade_to_v03\n") );

	lst_acc = g_hash_table_get_values(GLOBALS->h_acc);
	lnk_acc = g_list_first(lst_acc);
	while (lnk_acc != NULL)
	{
	Account *acc = lnk_acc->data;

		list = g_queue_peek_head_link(acc->txn_queue);
		while (list != NULL)
		{
		Transaction *entry = list->data;

			da_transaction_consistency(entry);
			list = g_list_next(list);
		}
		lnk_acc = g_list_next(lnk_acc);
	}
	g_list_free(lst_acc);


	list = g_list_first(GLOBALS->arc_list);
	while (list != NULL)
	{
	Archive *entry = list->data;

		da_archive_consistency(entry);
		list = g_list_next(list);
	}
}

static void homebank_upgrade_to_v04(void)
{
	DB( g_print("\n[hb-xml] homebank_upgrade_to_v04\n") );

	da_archive_glist_sorted(HB_GLIST_SORT_NAME);
}


// v0.4 to v0.5 :
// we must assume kxferacc exists in archives for internal xfer : bug 528923
// if not, delete automation from the archive
static void homebank_upgrade_to_v05(void)
{
GList *list;

	DB( g_print("\n[hb-xml] homebank_upgrade_to_v05\n") );

	list = g_list_first(GLOBALS->arc_list);
	while (list != NULL)
	{
	Archive *entry = list->data;

		da_archive_consistency(entry);
		list = g_list_next(list);
	}
}


// v0.5 to v0.6 : we must change kxferacc to 0 on non Xfer transactions
//#677351
static void homebank_upgrade_to_v06(void)
{
GList *lst_acc, *lnk_acc;
GList *list;

	DB( g_print("\n[hb-xml] homebank_upgrade_to_v06\n") );

	lst_acc = g_hash_table_get_values(GLOBALS->h_acc);
	lnk_acc = g_list_first(lst_acc);
	while (lnk_acc != NULL)
	{
	Account *acc = lnk_acc->data;

		list = g_queue_peek_head_link(acc->txn_queue);
		while (list != NULL)
		{
		Transaction *entry = list->data;
			da_transaction_consistency(entry);
			list = g_list_next(list);
		}
		lnk_acc = g_list_next(lnk_acc);
	}
	g_list_free(lst_acc);


	list = g_list_first(GLOBALS->arc_list);
	while (list != NULL)
	{
	Archive *entry = list->data;
		da_archive_consistency(entry);
		list = g_list_next(list);
	}
}


// v0.7 AF_BUDGET deleted instead of AF_NOBUDGET
static void homebank_upgrade_to_v07(void)
{
GList *lacc, *list;

	DB( g_print("\n[hb-xml] homebank_upgrade_to_v07\n") );

	lacc = list = g_hash_table_get_values(GLOBALS->h_acc);
	while (list != NULL)
	{
	Account *acc = list->data;

		if( acc->flags & AF_OLDBUDGET )	// budget include
		{
			acc->flags &= ~(AF_OLDBUDGET);
		}
		else
		{
			acc->flags |= AF_NOBUDGET;
		}

		list = g_list_next(list);
	}
	g_list_free(lacc);

}

static void homebank_upgrade_to_v08(void)
{
GList *lst_acc, *lnk_acc;
GList *list;

	DB( g_print("\n[hb-xml] homebank_upgrade_to_v08\n") );

	lst_acc = g_hash_table_get_values(GLOBALS->h_acc);
	lnk_acc = g_list_first(lst_acc);
	while (lnk_acc != NULL)
	{
	Account *acc = lnk_acc->data;

		list = g_queue_peek_head_link(acc->txn_queue);
		while (list != NULL)
		{
		Transaction *entry = list->data;
			da_transaction_consistency(entry);
			list = g_list_next(list);
		}
		lnk_acc = g_list_next(lnk_acc);
	}
	g_list_free(lst_acc);


}


static void homebank_upgrade_to_v10(void)
{
GList *lst_acc, *lnk_acc;
GList *list;

	DB( g_print("\n[hb-xml] homebank_upgrade_to_v10\n") );

	lst_acc = g_hash_table_get_values(GLOBALS->h_acc);
	lnk_acc = g_list_first(lst_acc);
	while (lnk_acc != NULL)
	{
	Account *acc = lnk_acc->data;
	
		list = g_queue_peek_head_link(acc->txn_queue);
		while (list != NULL)
		{
		Transaction *entry = list->data;

			entry->status = TXN_STATUS_NONE;
			if(entry->flags & OLDF_VALID)
				entry->status = TXN_STATUS_RECONCILED;
			else 
				if(entry->flags & OLDF_REMIND)
					entry->status = TXN_OLDSTATUS_REMIND;

			//remove those flags
			entry->flags &= ~(OLDF_VALID|OLDF_REMIND);

			list = g_list_next(list);
		}
		lnk_acc = g_list_next(lnk_acc);
	}
	g_list_free(lst_acc);

}


static void homebank_upgrade_to_v11(void)
{
GList *list;

	DB( g_print("\n[hb-xml] homebank_upgrade_to_v11\n") );

	list = g_list_first(GLOBALS->arc_list);
	while (list != NULL)
	{
	Archive *entry = list->data;

		entry->status = TXN_STATUS_NONE;
		if(entry->flags & OLDF_VALID)
			entry->status = TXN_STATUS_RECONCILED;
		else 
			if(entry->flags & OLDF_REMIND)
				entry->status = TXN_OLDSTATUS_REMIND;

		//remove those flags
		entry->flags &= ~(OLDF_VALID|OLDF_REMIND);

		list = g_list_next(list);
	}

}


// v0.6 to v0.7 : assign a default currency
static void homebank_upgrade_to_v12(void)
{
	DB( g_print("\n[hb-xml] homebank_upgrade_to_v12\n") );

	// set a base currency to the hbfile if not
	DB( g_print("GLOBALS->kcur %d\n", GLOBALS->kcur) );

	ui_dialog_upgrade_choose_currency();
}


static void homebank_upgrade_to_v12_7(void)
{
GList *lst_acc, *lnk_acc;

	DB( g_print("\n[hb-xml] homebank_upgrade_to_v12\n") );

	//#1674045 exclude closed account from everywhere to
	//keep continuity for user that don't want to change this
	lst_acc = g_hash_table_get_values(GLOBALS->h_acc);
	lnk_acc = g_list_first(lst_acc);
	while (lnk_acc != NULL)
	{
	Account *acc = lnk_acc->data;

		if( acc->flags & AF_CLOSED )
		{
			if( !(acc->flags & AF_NOSUMMARY) )
				acc->flags |= AF_NOSUMMARY;
			if( !(acc->flags & AF_NOBUDGET) )
				acc->flags |= AF_NOBUDGET;
			if( !(acc->flags & AF_NOREPORT) )
				acc->flags |= AF_NOREPORT;
		}
		lnk_acc = g_list_next(lnk_acc);
	}
	g_list_free(lst_acc);
}


static void homebank_upgrade_to_v13(void)
{
GList *list;
guint32 newkey;

	DB( g_print("\n[hb-xml] homebank_upgrade_to_v13\n") );

	//#1008629 assign a key to each archive
	newkey = 1;
	list = g_list_first(GLOBALS->arc_list);
	while (list != NULL)
	{
	Archive *item = list->data;
		
		item->key = newkey++;
		list = g_list_next(list);
	}

}


static void homebank_upgrade_to_v14(void)
{
GList *lst_acc, *lnk_acc, *lasg;
GList *list;

	DB( g_print("\n[hb-xml] homebank_upgrade_to_v14\n") );

	//internal xfer no more a payment => goto a flags
	//update every txn/arc
	lst_acc = g_hash_table_get_values(GLOBALS->h_acc);
	lnk_acc = g_list_first(lst_acc);
	while (lnk_acc != NULL)
	{
	Account *acc = lnk_acc->data;
	
		list = g_queue_peek_head_link(acc->txn_queue);
		while (list != NULL)
		{
		Transaction *item = list->data;

			if( item->paymode == OLDPAYMODE_INTXFER )
			{
				item->flags |= OF_INTXFER;
				item->paymode = PAYMODE_NONE;
			}
			list = g_list_next(list);
		}
		lnk_acc = g_list_next(lnk_acc);
	}
	g_list_free(lst_acc);	

	list = g_list_first(GLOBALS->arc_list);
	while (list != NULL)
	{
	Archive *item = list->data;
		
		if( item->paymode == OLDPAYMODE_INTXFER )
		{
			item->flags |= OF_INTXFER;
			item->paymode = PAYMODE_NONE;
		}
		list = g_list_next(list);
	}

	//assignment now have position+name, so initiate it
	lasg = list = g_hash_table_get_values(GLOBALS->h_rul);
	while (list != NULL)
	{
	Assign *item = list->data;

		item->pos  = item->key;
		list = g_list_next(list);
	}
	g_list_free(lasg);	
	
}

// migrate 5.9.5
static void homebank_upgrade_to_v14_595(void)
{
	DB( g_print("\n[hb-xml] homebank_upgrade_to_v14_595\n") );

	//#2121309 fix potential bad position
	da_acc_pos_sanitize();
}



// migrate 5.9.2
static void homebank_upgrade_to_v14_592(void)
{
GList *list;

	DB( g_print("\n[hb-xml] homebank_upgrade_to_v14_592\n") );

	//##2112135 fix limit bad flag
	list = g_list_first(GLOBALS->arc_list);
	while (list != NULL)
	{
	Archive *item = list->data;

		if( item->rec_flags & (TF_LIMIT) && ((item->limit >= 366) || item->nextdate >= HB_MAXDATE) )
		{
			DB( g_print(" fix arc limit %d\n", item->limit) );
			item->rec_flags &= ~(TF_LIMIT | TF_RECUR);
			item->limit = 0;
			item->nextdate = GLOBALS->today;
		}

		list = g_list_next(list);
	}
}


// migrate 5.9
static void homebank_upgrade_to_v14_59(void)
{
GList *lst_acc, *lnk_acc;
GList *list;

	DB( g_print("\n[hb-xml] homebank_upgrade_to_v14_59\n") );

	//#chnage template/scheduled
	list = g_list_first(GLOBALS->arc_list);
	while (list != NULL)
	{
	Archive *item = list->data;

		//#move arc flags
		if( item->flags & (OLDF_AUTO|OLDF_LIMIT))
		{
			DB( g_print(" move tpl flags to rec_flags\n") );
			item->rec_flags = 0;
			if(item->flags & OLDF_AUTO)
				item->rec_flags |= TF_RECUR;
			if(item->flags & OLDF_LIMIT)
				item->rec_flags |= TF_LIMIT;

			item->flags &= ~(OLDF_AUTO|OLDF_LIMIT);
		}

		//#clean arc flags OLDF_ADDED|OLDF_CHANGED 
		if( item->flags & (OLDF_ADDED|OLDF_CHANGED))
		{

			DB( g_print(" clean tpl flags\n") );
			item->flags &= ~(OLDF_ADDED|OLDF_CHANGED);
		}

		list = g_list_next(list);
	}

	//#remind status move to flag
	lst_acc = g_hash_table_get_values(GLOBALS->h_acc);
	lnk_acc = g_list_first(lst_acc);
	while (lnk_acc != NULL)
	{
	Account *acc = lnk_acc->data;
	
		list = g_queue_peek_head_link(acc->txn_queue);
		while (list != NULL)
		{
		Transaction *item = list->data;

			//also remove tpl/sch flags
			item->flags &= ~(OF_REMIND|OLDF_AUTO|OLDF_LIMIT);	
			if( item->status == TXN_OLDSTATUS_REMIND )
			{
				DB( g_print(" move remind status\n") );
				item->flags |= OF_REMIND;
				item->status = 0;
			}

			if( item->status == TXN_OLDSTATUS_VOID )
			{
				DB( g_print(" update void status\n") );
				item->status = TXN_STATUS_VOID;
			}
			list = g_list_next(list);
		}
		lnk_acc = g_list_next(lnk_acc);
	}
	g_list_free(lst_acc);

}


static void homebank_upgrade_to_v14_12(void)
{
gint oldsmode, smode;

	DB( g_print("\n[hb-xml] homebank_upgrade_to_v14_12\n") );

	//convert old smode to new one
	oldsmode = GLOBALS->auto_smode;
	smode = 0;
	switch(oldsmode)
	{
		case 0: 
			smode = ARC_POSTMODE_PAYOUT;
			break;
		case 1:
		{
			if(GLOBALS->auto_nbdays == 0)
				smode = ARC_POSTMODE_DUEDATE;
			else
				smode = ARC_POSTMODE_ADVANCE;
		}
		break;
	}
	DB( g_print("migrated smode: %d to %d\n", oldsmode, smode) );
	GLOBALS->auto_smode = smode;

}


// lower v0.6 : we must assume categories/payee exists
// and strong link to xfer
// #632496
static void homebank_upgrade_lower_v06(void)
{
GList *lst_acc, *lnk_acc;
Category *cat;
Payee *pay;
GList *lrul, *list;

	DB( g_print("\n[hb-xml] homebank_upgrade_lower_v06\n") );

	lst_acc = g_hash_table_get_values(GLOBALS->h_acc);
	lnk_acc = g_list_first(lst_acc);
	while (lnk_acc != NULL)
	{
	Account *acc = lnk_acc->data;
	
		list = g_queue_peek_head_link(acc->txn_queue);
		while (list != NULL)
		{
		Transaction *entry = list->data;

			//also strong link internal xfer
			if(entry->paymode == OLDPAYMODE_INTXFER && entry->kxfer == 0)
			{
			Transaction *child = transaction_old_get_child_transfer(entry);
				if(child != NULL)
				{
					transaction_xfer_change_to_child(entry, child);
				}
			}

			da_transaction_consistency(entry);
			
			list = g_list_next(list);
		}
		lnk_acc = g_list_next(lnk_acc);
	}
	g_list_free(lst_acc);


	lrul = list = g_hash_table_get_values(GLOBALS->h_rul);
	while (list != NULL)
	{
	Assign *entry = list->data;

		cat = da_cat_get(entry->kcat);
		if(cat == NULL)
		{
			DB( g_print(" !! fixing cat for rul: %d is unknown\n", entry->kcat) );
			entry->kcat = 0;
		}

		pay = da_pay_get(entry->kpay);
		if(pay == NULL)
		{
			DB( g_print(" !! fixing pay for rul: %d is unknown\n", entry->kpay) );
			entry->kpay = 0;
		}


		list = g_list_next(list);
	}
	g_list_free(lrul);
}


/* = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = */

/*
** misc xml attributes methods
*/
static void hb_xml_append_txt(GString *gstring, gchar *attrname, gchar *value)
{
	if(value != NULL && *value != 0)
	{
		gchar *escaped = g_markup_escape_text(value, -1);
		g_string_append_printf(gstring, " %s=\"%s\"", attrname, escaped);
		g_free(escaped);
	}
}

static void
append_escaped_text (GString     *str,
                     const gchar *text,
                     gssize       length)
{
  const gchar *p;
  const gchar *end;
  gunichar c;

  p = text;
  end = text + length;

  while (p < end)
    {
      const gchar *next;
      next = g_utf8_next_char (p);

      switch (*p)
        {
        case '&':
          g_string_append (str, "&amp;");
          break;

        case '<':
          g_string_append (str, "&lt;");
          break;

        case '>':
          g_string_append (str, "&gt;");
          break;

        case '\'':
          g_string_append (str, "&apos;");
          break;

        case '"':
          g_string_append (str, "&quot;");
          break;

        default:
          c = g_utf8_get_char (p);
          if ((0x1 <= c && c <= 0x8) ||
              (0xa <= c && c  <= 0xd) ||	//changed here from b<->c to a<->d
              (0xe <= c && c <= 0x1f) ||
              (0x7f <= c && c <= 0x84) ||
              (0x86 <= c && c <= 0x9f))
            g_string_append_printf (str, "&#x%x;", c);
          else
            g_string_append_len (str, p, next - p);
          break;
        }

      p = next;
    }
}

// we override g_markup_escape_text from glib to encode \n (LF) & \r (CR)
static void hb_xml_append_txt_crlf(GString *gstring, gchar *attrname, gchar *value)
{
	if(value != NULL && *value != 0)
	{
	gssize length;
	GString *escaped;
		
		//gchar *escaped = g_markup_escape_text(value, -1);
		length = strlen (value);
		escaped = g_string_sized_new (length);
		append_escaped_text (escaped, value, length);
		g_string_append_printf(gstring, " %s=\"%s\"", attrname, escaped->str);
		g_string_free (escaped, TRUE);
	}
}

static void hb_xml_append_int0(GString *gstring, gchar *attrname, guint32 value)
{
	g_string_append_printf(gstring, " %s=\"%d\"", attrname, value);
}
	
static void hb_xml_append_int(GString *gstring, gchar *attrname, guint32 value)
{
	if(value != 0)
	{
		hb_xml_append_int0(gstring, attrname, value);
	}
}

static void hb_xml_append_amt(GString *gstring, gchar *attrname, gdouble amount)
{
char buf[G_ASCII_DTOSTR_BUF_SIZE];

	//we must use this, as fprintf use locale decimal settings and not '.'
	g_ascii_dtostr (buf, sizeof (buf), amount);
	g_string_append_printf(gstring, " %s=\"%s\"", attrname, buf);
}



/* = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = */


static void filter_group_import_keys(Filter *flt, gint group, gchar *text)
{
gchar **str_array;
gboolean is_set;
gint len, i;

	DB( g_print(" import keys '%s'\n", text) );

	str_array = g_strsplit (text, ",", -1);
	len = g_strv_length( str_array );
	for(i=0;i<len;i++)
	{
	guint32 key = atoi(str_array[i]);

		//DB( g_print("\n [%d] k=%d", i, key) );

		is_set = FALSE;
		switch(group)
		{
			case FLT_GRP_ACCOUNT:
				if( da_acc_get(key) )
				{
					is_set = da_flt_status_acc_set(flt, key, TRUE);
				}
				break;
			case FLT_GRP_PAYEE:
				if( da_pay_get(key) )
				{
					is_set = da_flt_status_pay_set(flt, key, TRUE);
				}
				break;
			case FLT_GRP_CATEGORY:
				if( da_cat_get(key) )
				{
					is_set = da_flt_status_cat_set(flt, key, TRUE);
				}
				break;
			case FLT_GRP_TAG:
				if( da_tag_get(key) )
				{
					is_set = da_flt_status_tag_set(flt, key, TRUE);
				}
				break;
		}

		DB( g_print(" > '%s'", is_set ? "set" : "**skip**") );
	}
	g_strfreev(str_array);
}


static void filter_group_import(Filter *flt, gint group, const gchar *text)
{
gchar **str_array = NULL;
gchar **bol_array = NULL;
gint i, len;

	g_return_if_fail( flt != NULL );

	DB( g_print("\n[filter] group import '%s'\n", flt->name == NULL ? "noname" : flt->name ) );
	DB( g_print(" '%d' > '%s'\n", group, text) );

	str_array = g_strsplit (text, "|", 2);
	if( g_strv_length( str_array ) != 2 )
		goto end;

	flt->option[group] = atoi(str_array[0]);

	switch(group)
	{
		//0:option 1:range 2:min 3:max
		case FLT_GRP_DATE:
			bol_array = g_strsplit (str_array[1], ",", 3);
			len = g_strv_length( bol_array );

			flt->range = atoi(bol_array[0]);
			if(len >= 2 && flt->range == FLT_RANGE_MISC_CUSTOM)
			{
				flt->mindate = atoi(bol_array[1]);
				flt->maxdate = atoi(bol_array[2]);
			}
			g_strfreev(bol_array);
			break;
		
		case FLT_GRP_ACCOUNT:
			flt->option[group] = atoi(str_array[0]);
			filter_group_import_keys(flt, FLT_GRP_ACCOUNT, str_array[1]);
			break;

		case FLT_GRP_PAYEE:
			flt->option[group] = atoi(str_array[0]);
			filter_group_import_keys(flt, FLT_GRP_PAYEE, str_array[1]);
			break;

		case FLT_GRP_CATEGORY:
			flt->option[group] = atoi(str_array[0]);
			filter_group_import_keys(flt, FLT_GRP_CATEGORY, str_array[1]);
			break;

		case FLT_GRP_TAG:
			flt->option[group] = atoi(str_array[0]);
			filter_group_import_keys(flt, FLT_GRP_TAG, str_array[1]);
			break;
			
		case FLT_GRP_STATUS:
			flt->option[group] = atoi(str_array[0]);
			bol_array = g_strsplit (str_array[1], ",", -1);
			if( g_strv_length( bol_array ) == 3 )
			{
				flt->sta_non = atoi(bol_array[0]);
				flt->sta_clr = atoi(bol_array[1]);
				flt->sta_rec = atoi(bol_array[2]);
			}
			g_strfreev(bol_array);
			break;

		case FLT_GRP_TYPE:
			flt->option[group] = atoi(str_array[0]);
			bol_array = g_strsplit (str_array[1], ",", -1);
			if( g_strv_length( bol_array ) == 4 )
			{
				flt->typ_nexp = atoi(bol_array[0]);
				flt->typ_ninc = atoi(bol_array[1]);
				flt->typ_xexp = atoi(bol_array[2]);
				flt->typ_xinc = atoi(bol_array[3]);
			}
			g_strfreev(bol_array);
			break;

		case FLT_GRP_PAYMODE:
			flt->option[group] = atoi(str_array[0]);
			bol_array = g_strsplit (str_array[1], ",", -1);
			len = g_strv_length( bol_array );
			if( len < NUM_PAYMODE_MAX )
			{
				for(i=0;i<len;i++)
				{
				//#2100875 CLAMP not MAX
				gint id = CLAMP(atoi(bol_array[i]), 0, NUM_PAYMODE_MAX-1);

					flt->paymode[id] = TRUE;
				}
			}
			break;

		case FLT_GRP_AMOUNT:
			flt->option[group] = atoi(str_array[0]);
			bol_array = g_strsplit (str_array[1], ",", -1);
			if( g_strv_length( bol_array ) == 2 )
			{
				flt->minamount = g_ascii_strtod(bol_array[0], NULL);
				flt->maxamount = g_ascii_strtod(bol_array[1], NULL);
			}
			break;

		case FLT_GRP_TEXT:
			flt->option[group] = atoi(str_array[0]);
			bol_array = g_strsplit (str_array[1], "¤", -1);
			if( g_strv_length( bol_array ) == 3 )
			{
				flt->exact = atoi(bol_array[0]);
				flt->memo  = g_strdup(bol_array[1]);
				flt->number  = g_strdup(bol_array[2]);
			}
			break;
	}

end:
	g_strfreev(str_array);

}


static gchar *filter_group_export(Filter *flt, gint group)
{
gchar *retval = NULL;
GString *node;
guint i;

	DB( g_print("\n[filter] group export '%s'\n", flt->name == NULL ? "noname" : flt->name )) ;

	g_return_val_if_fail( flt != NULL, NULL );


	switch(group)
	{
		case FLT_GRP_DATE:
			if(flt->option[group] > 0)
			{
				//TODO: maybe always keep 4 values here
				if(flt->range == FLT_RANGE_MISC_CUSTOM)
					retval = g_strdup_printf("%d|%d,%d,%d", flt->option[group], FLT_RANGE_MISC_CUSTOM, flt->mindate, flt->maxdate);
				else
					retval = g_strdup_printf("%d|%d", flt->option[group], flt->range);
				
				DB( g_printf(" date > '%s'\n", retval) );
			}
			break;
		case FLT_GRP_ACCOUNT:
			if(flt->option[group] > 0)
			{
				node = g_string_sized_new(flt->gbacc->len);
				g_string_append_printf(node, "%d|", flt->option[group]);
				DB( g_printf("acc len:%d\n", flt->gbacc->len) );
				for(i=0;i<flt->gbacc->len;i++)
				{
					if( da_flt_status_acc_get(flt, i) == TRUE )
						g_string_append_printf(node, "%d,", i);
				}
				g_string_erase(node, node->len-1, 1);
				retval = g_string_free(node, FALSE);
				DB( g_printf(" acc > '%s'\n", retval) );
				node = NULL;
			}
			break;
		case FLT_GRP_PAYEE:
			if(flt->option[group] > 0)
			{
				node = g_string_sized_new(flt->gbpay->len);
				g_string_append_printf(node, "%d|", flt->option[group]);
				DB( g_printf("pay len:%d\n", flt->gbpay->len) );
				for(i=0;i<flt->gbpay->len;i++)
				{
					if( da_flt_status_pay_get(flt, i) == TRUE )
						g_string_append_printf(node, "%d,", i);
				}
				g_string_erase(node, node->len-1, 1);
				retval = g_string_free(node, FALSE);
				DB( g_printf(" pay > '%s'\n", retval) );
				node = NULL;
			}
			break;
		case FLT_GRP_CATEGORY:
			if(flt->option[group] > 0)
			{
				node = g_string_sized_new(flt->gbcat->len);
				g_string_append_printf(node, "%d|", flt->option[group]);
				DB( g_printf("cat len:%d\n", flt->gbcat->len) );
				for(i=0;i<flt->gbcat->len;i++)
				{
					if( da_flt_status_cat_get(flt, i) == TRUE )
						g_string_append_printf(node, "%d,", i);
				}
				g_string_erase(node, node->len-1, 1);
				retval = g_string_free(node, FALSE);

				DB( g_printf(" cat > '%s'\n", retval) );
				node = NULL;
			}
			break;
		case FLT_GRP_TAG:
			if(flt->option[group] > 0)
			{
				node = g_string_sized_new(flt->gbtag->len);
				g_string_append_printf(node, "%d|", flt->option[group]);
				DB( g_printf("tag len:%d\n", flt->gbtag->len) );
				for(i=0;i<flt->gbtag->len;i++)
				{
					if( da_flt_status_tag_get(flt, i) == TRUE )
						g_string_append_printf(node, "%d,", i);
				}
				g_string_erase(node, node->len-1, 1);
				retval = g_string_free(node, FALSE);
				DB( g_printf(" tag > '%s'\n", retval) );
				node = NULL;
			}
			break;
		case FLT_GRP_STATUS:
			if(flt->option[group] > 0)
			{
				node = g_string_sized_new(30);
				g_string_append_printf(node, "%d|", flt->option[group]);
		
				g_string_append_printf(node, "%d,", flt->sta_non);
				g_string_append_printf(node, "%d,", flt->sta_clr);
				g_string_append_printf(node, "%d" , flt->sta_rec);

				retval = g_string_free(node, FALSE);
				DB( g_printf(" sta > '%s'\n", retval) );
				node = NULL;
			}
			break;
		case FLT_GRP_TYPE:
			if(flt->option[group] > 0)
			{
				node = g_string_sized_new(30);
				g_string_append_printf(node, "%d|", flt->option[group]);

				g_string_append_printf(node, "%d,", flt->typ_nexp);
				g_string_append_printf(node, "%d,", flt->typ_ninc);
				g_string_append_printf(node, "%d,", flt->typ_xexp);
				g_string_append_printf(node, "%d" , flt->typ_xinc);

				retval = g_string_free(node, FALSE);
				DB( g_printf(" typ > '%s'\n", retval) );
				node = NULL;
			}
			break;
		case FLT_GRP_PAYMODE:
			if(flt->option[group] > 0)
			{
				node = g_string_sized_new(30);
				g_string_append_printf(node, "%d|", flt->option[group]);
				for(i=0;i<NUM_PAYMODE_MAX;i++)
				{
					if( flt->paymode[i] == TRUE )
						g_string_append_printf(node, "%d,", i);
				}
				g_string_erase(node, node->len-1, 1);
				retval = g_string_free(node, FALSE);
				DB( g_printf(" pay > '%s'\n", retval) );
				node = NULL;
			}
			break;
		case FLT_GRP_AMOUNT:
			if(flt->option[group] > 0)
			{
			char buf[G_ASCII_DTOSTR_BUF_SIZE];

				node = g_string_sized_new(30);
				g_string_append_printf(node, "%d|", flt->option[group]);

				//we must use this, as fprintf use locale decimal settings and not '.'
				g_ascii_dtostr (buf, sizeof (buf), flt->minamount);
				g_string_append(node, buf);
				g_string_append(node, ",");
				g_ascii_dtostr (buf, sizeof (buf), flt->maxamount);
				g_string_append(node, buf);
				retval = g_string_free(node, FALSE);
				DB( g_printf(" amt > '%s'\n", retval) );
				node = NULL;
			}
			break;
		case FLT_GRP_TEXT:
			if(flt->option[group] > 0)
			{
				node = g_string_sized_new(30);
				g_string_append_printf(node, "%d|", flt->option[group]);
				g_string_append_printf(node, "%d¤%s¤%s", flt->exact, flt->memo, flt->number);
				retval = g_string_free(node, FALSE);
				DB( g_printf(" txt > '%s'\n", retval) );
				node = NULL;
			}
			break;
	}
	return retval;
}




static void hb_xml_append_fltgroup(GString *gstring, gchar *attrname, Filter *flt, gint group)
{
gchar *tmpstr;

	DB( g_printf("[xml] append fltgrp for '%s' %d\n", attrname, group) );
	tmpstr = filter_group_export(flt, group);
	if(tmpstr)
	{
		DB( g_printf(" > '%s'\n", tmpstr) );
		hb_xml_append_txt(gstring, attrname, tmpstr);
		g_free(tmpstr);
	}
}



/* = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = */


static void homebank_load_xml_acc(ParseContext *ctx, const gchar **attribute_names, const gchar **attribute_values)
{
Account *entry = da_acc_malloc();
gint i;

	for (i = 0; attribute_names[i] != NULL; i++)
	{
		//DB( g_print(" att='%s' val='%s'\n", attribute_names[i], attribute_values[i]) );

		     if(!strcmp (attribute_names[i], "key"     )) { entry->key   = atoi(attribute_values[i]); }
		else if(!strcmp (attribute_names[i], "flags"   )) { entry->flags = atoi(attribute_values[i]); }
		else if(!strcmp (attribute_names[i], "pos"     )) { entry->pos   = atoi(attribute_values[i]); }
		else if(!strcmp (attribute_names[i], "type"    )) { entry->type = atoi(attribute_values[i]); }
		else if(!strcmp (attribute_names[i], "curr"    )) { entry->kcur = atoi(attribute_values[i]); }
		else if(!strcmp (attribute_names[i], "name"    )) { if(strcmp(attribute_values[i],"(null)") && attribute_values[i] != NULL) entry->name = g_strdup(attribute_values[i]); }
		else if(!strcmp (attribute_names[i], "number"  )) { if(strcmp(attribute_values[i],"(null)") && attribute_values[i] != NULL) entry->number = g_strdup(attribute_values[i]); }
		else if(!strcmp (attribute_names[i], "bankname")) { if(strcmp(attribute_values[i],"(null)") && attribute_values[i] != NULL) entry->bankname = g_strdup(attribute_values[i]); }
		else if(!strcmp (attribute_names[i], "initial" )) { entry->initial = g_ascii_strtod(attribute_values[i], NULL); }

		else if(!strcmp (attribute_names[i], "minimum" )) { entry->minimum = g_ascii_strtod(attribute_values[i], NULL); }
		else if(!strcmp (attribute_names[i], "maximum" )) { entry->maximum = g_ascii_strtod(attribute_values[i], NULL); }
		else if(!strcmp (attribute_names[i], "cheque1" )) { entry->cheque1 = atoi(attribute_values[i]); }
		else if(!strcmp (attribute_names[i], "cheque2" )) { entry->cheque2 = atoi(attribute_values[i]); }
		//5.7
		else if(!strcmp (attribute_names[i], "website" )) { if(strcmp(attribute_values[i],"(null)") && attribute_values[i] != NULL) entry->website = g_strdup(attribute_values[i]); }
		else if(!strcmp (attribute_names[i], "notes"   )) { if(strcmp(attribute_values[i],"(null)") && attribute_values[i] != NULL) entry->notes = g_strdup(attribute_values[i]); }
		else if(!strcmp (attribute_names[i], "tpl"     )) { entry->karc = atoi(attribute_values[i]); }
		else if(!strcmp (attribute_names[i], "grp"     )) { entry->kgrp = atoi(attribute_values[i]); }
		//5.5
		else if(!strcmp (attribute_names[i], "ccday"   )) { entry->cccday = atoi(attribute_values[i]); }
		else if(!strcmp (attribute_names[i], "rdate"   )) { entry->rdate = atoi(attribute_values[i]); }
	}

	//all attribute loaded: append
	da_acc_insert(entry);
}


static void homebank_load_xml_asg(ParseContext *ctx, const gchar **attribute_names, const gchar **attribute_values)
{
Assign *entry = da_asg_malloc();
gint exact = 0;
gint i;

	for (i = 0; attribute_names[i] != NULL; i++)
	{
		//DB( g_print(" att='%s' val='%s'\n", attribute_names[i], attribute_values[i]) );

		     if(!strcmp (attribute_names[i], "key"     )) { entry->key   = atoi(attribute_values[i]); }
		else if(!strcmp (attribute_names[i], "flags"   )) { entry->flags = atoi(attribute_values[i]); }
		else if(!strcmp (attribute_names[i], "pos"     )) { entry->pos   = atoi(attribute_values[i]); }
		else if(!strcmp (attribute_names[i], "field"   )) { entry->field = atoi(attribute_values[i]); }
		else if(!strcmp (attribute_names[i], "name"    )) { if(strcmp(attribute_values[i],"(null)") && attribute_values[i] != NULL) entry->search = g_strdup(attribute_values[i]); }
		else if(!strcmp (attribute_names[i], "notes"   )) { if(strcmp(attribute_values[i],"(null)") && attribute_values[i] != NULL) entry->notes = g_strdup(attribute_values[i]); }
		else if(!strcmp (attribute_names[i], "payee"   )) { entry->kpay = atoi(attribute_values[i]); }
		else if(!strcmp (attribute_names[i], "category")) { entry->kcat = atoi(attribute_values[i]); }
		else if(!strcmp (attribute_names[i], "paymode" )) { entry->paymode = atoi(attribute_values[i]); }
		//#1999879 assignment by amount do not save
		else if(!strcmp (attribute_names[i], "amount"  )) { entry->amount = g_ascii_strtod(attribute_values[i], NULL); }
		// prior v08
		else if(!strcmp (attribute_names[i], "exact" )) { exact = atoi(attribute_values[i]); }
		else if(!strcmp (attribute_names[i], "tags"       ))
		{
			if(attribute_values[i] != NULL && strlen(attribute_values[i]) > 0 && strcmp(attribute_values[i],"(null)") != 0 )
			{
				entry->tags = tags_parse(attribute_values[i]);
			}
		}
	}

	/* in v08 exact moved to flag */
	if( ctx->file_version <= 0.7)
	{
		entry->flags = (ASGF_DOCAT|ASGF_DOPAY);
		if( exact > 0 )
		   entry->flags |= ASGF_EXACT;
	}

	//all attribute loaded: append
	//#1892828 append change the pos...
	//da_asg_append(entry);
	da_asg_insert(entry);

}


static void homebank_load_xml_pay(ParseContext *ctx, const gchar **attribute_names, const gchar **attribute_values)
{
Payee *entry = da_pay_malloc();
gint i;

	for (i = 0; attribute_names[i] != NULL; i++)
	{
		//DB( g_print(" att='%s' val='%s'\n", attribute_names[i], attribute_values[i]) );

			 if(!strcmp (attribute_names[i], "key"  )) { entry->key = atoi(attribute_values[i]); }
		else if(!strcmp (attribute_names[i], "flags")) { entry->flags = atoi(attribute_values[i]); }
		else if(!strcmp (attribute_names[i], "name" )) { entry->name = g_strdup(attribute_values[i]); }
		else if(!strcmp (attribute_names[i], "category")) { entry->kcat = atoi(attribute_values[i]); }
		else if(!strcmp (attribute_names[i], "paymode" )) { entry->paymode = atoi(attribute_values[i]); }
		else if(!strcmp (attribute_names[i], "notes"   )) { if(strcmp(attribute_values[i],"(null)") && attribute_values[i] != NULL) entry->notes = g_strdup(attribute_values[i]); }

	}

	//all attribute loaded: append
	da_pay_insert(entry);
}


static void homebank_load_xml_prop(ParseContext *ctx, const gchar **attribute_names, const gchar **attribute_values)
{
gint i;

	for (i = 0; attribute_names[i] != NULL; i++)
	{
		     if(!strcmp (attribute_names[i], "title"       )) { g_free(GLOBALS->owner); GLOBALS->owner = g_strdup(attribute_values[i]); }
		else if(!strcmp (attribute_names[i], "curr"        )) { GLOBALS->kcur = atoi(attribute_values[i]); }
		else if(!strcmp (attribute_names[i], "car_category")) { GLOBALS->vehicle_category = atoi(attribute_values[i]); }
		
		else if(!strcmp (attribute_names[i], "auto_smode"  )) { GLOBALS->auto_smode = atoi(attribute_values[i]); }
		else if(!strcmp (attribute_names[i], "auto_weekday")) { GLOBALS->auto_weekday = atoi(attribute_values[i]); }
		else if(!strcmp (attribute_names[i], "auto_nbmonths")) { GLOBALS->auto_nbmonths = atoi(attribute_values[i]); }
		else if(!strcmp (attribute_names[i], "auto_nbdays" )) { GLOBALS->auto_nbdays = atoi(attribute_values[i]); }
		
		else if(!strcmp (attribute_names[i], "earnbyh"     )) { GLOBALS->lifen_earnbyh = g_ascii_strtod(attribute_values[i], NULL); }
	}
}


static void homebank_load_xml_cat(ParseContext *ctx, const gchar **attribute_names, const gchar **attribute_values)
{
Category *entry = da_cat_malloc();
gboolean budget;
gint i, j;

	for (i = 0; attribute_names[i] != NULL; i++)
	{
		//DB( g_print(" att='%s' val='%s'\n", attribute_names[i], attribute_values[i]) );

		     if(!strcmp (attribute_names[i], "key"   )) { entry->key = atoi(attribute_values[i]); }
		else if(!strcmp (attribute_names[i], "parent")) { entry->parent = atoi(attribute_values[i]); }
		else if(!strcmp (attribute_names[i], "flags" )) { entry->flags = atoi(attribute_values[i]); }
		else if(!strcmp (attribute_names[i], "name"  )) { entry->name = g_strdup(attribute_values[i]); }

		budget = FALSE;
		for(j=0;j<=12;j++)
		{
		gchar *tmpname;

			tmpname = g_strdup_printf ("b%d", j);
			if(!(strcmp (attribute_names[i], tmpname))) { entry->budget[j] = g_ascii_strtod(attribute_values[i], NULL); }
			g_free(tmpname);

			if(entry->budget[j]) budget = TRUE;
		}
		if(budget == TRUE)
			entry->flags |= GF_BUDGET;

	}

	//all attribute loaded: append
	da_cat_insert( entry);
}


static void homebank_load_xml_cur(ParseContext *ctx, const gchar **attribute_names, const gchar **attribute_values)
{
Currency *entry = da_cur_malloc ();
gint i;

	for (i = 0; attribute_names[i] != NULL; i++)
	{
		//DB( g_print(" att='%s' val='%s'\n", attribute_names[i], attribute_values[i]) );

			 if(!strcmp (attribute_names[i], "key"   )) { entry->key = atoi(attribute_values[i]); }
		else if(!strcmp (attribute_names[i], "flags" )) { entry->flags = atoi(attribute_values[i]); }
		else if(!strcmp (attribute_names[i], "name"  )) { entry->name = g_strdup(attribute_values[i]); }
		else if(!strcmp (attribute_names[i], "iso"   )) { entry->iso_code = g_strdup(attribute_values[i]); }
		else if(!strcmp (attribute_names[i], "symb"  )) { entry->symbol = g_strdup(attribute_values[i]); }
		else if(!strcmp (attribute_names[i], "syprf" )) { entry->sym_prefix = atoi(attribute_values[i]); }
		else if(!strcmp (attribute_names[i], "dchar" )) { entry->decimal_char = g_strdup(attribute_values[i]); }
		else if(!strcmp (attribute_names[i], "gchar" )) { entry->grouping_char = g_strdup(attribute_values[i]); }
		else if(!strcmp (attribute_names[i], "frac"  )) { entry->frac_digits = atoi(attribute_values[i]); }
		else if(!strcmp (attribute_names[i], "rate"  )) { entry->rate = g_ascii_strtod(attribute_values[i], NULL); }
		else if(!strcmp (attribute_names[i], "mdate ")) { entry->mdate = atoi(attribute_values[i]); }

	}

	//all attribute loaded: append
	da_cur_insert (entry);
}


static void homebank_load_xml_grp(ParseContext *ctx, const gchar **attribute_names, const gchar **attribute_values)
{
Group *entry = da_grp_malloc();
gint i;

	for (i = 0; attribute_names[i] != NULL; i++)
	{
		DB( g_print(" att='%s' val='%s'\n", attribute_names[i], attribute_values[i]) );

		     if(!strcmp (attribute_names[i], "key"  )) { entry->key = atoi(attribute_values[i]); }
		//else if(!strcmp (attribute_names[i], "type")) { entry->type = atoi(attribute_values[i]); }
		//else if(!strcmp (attribute_names[i], "flags")) { entry->flags = atoi(attribute_values[i]); }
		else if(!strcmp (attribute_names[i], "name" )) { entry->name = g_strdup(attribute_values[i]); }
	}

	//all attribute loaded: append
	da_grp_insert(entry);
}


static void homebank_load_xml_flt(ParseContext *ctx, const gchar **attribute_names, const gchar **attribute_values)
{
Filter *entry = da_flt_malloc();
gint i;

	for (i = 0; attribute_names[i] != NULL; i++)
	{
		//DB( g_print(" att='%s' val='%s'\n", attribute_names[i], attribute_values[i]) );

		     if(!strcmp (attribute_names[i], "key"  )) { entry->key = atoi(attribute_values[i]); }
		else if(!strcmp (attribute_names[i], "name" )) { entry->name = g_strdup(attribute_values[i]); }

		else if(!strcmp (attribute_names[i], "dat" )) { filter_group_import(entry, FLT_GRP_DATE, attribute_values[i]); }
		else if(!strcmp (attribute_names[i], "acc" )) { filter_group_import(entry, FLT_GRP_ACCOUNT, attribute_values[i]); }
		else if(!strcmp (attribute_names[i], "pay" )) { filter_group_import(entry, FLT_GRP_PAYEE, attribute_values[i]); }
		else if(!strcmp (attribute_names[i], "cat" )) { filter_group_import(entry, FLT_GRP_CATEGORY, attribute_values[i]); }
		else if(!strcmp (attribute_names[i], "tag" )) { filter_group_import(entry, FLT_GRP_TAG, attribute_values[i]); }
		else if(!strcmp (attribute_names[i], "txt" )) { filter_group_import(entry, FLT_GRP_TEXT, attribute_values[i]); }
		else if(!strcmp (attribute_names[i], "amt" )) { filter_group_import(entry, FLT_GRP_AMOUNT, attribute_values[i]); }
		else if(!strcmp (attribute_names[i], "mod" )) { filter_group_import(entry, FLT_GRP_PAYMODE, attribute_values[i]); }
		else if(!strcmp (attribute_names[i], "sta" )) { filter_group_import(entry, FLT_GRP_STATUS, attribute_values[i]); }
		else if(!strcmp (attribute_names[i], "typ" )) { filter_group_import(entry, FLT_GRP_TYPE, attribute_values[i]); }
	}

	//5.8 force alldate if off
	if( entry->option[FLT_GRP_DATE] == 0 )
	{
		entry->option[FLT_GRP_DATE] = 1;
		entry->range = FLT_RANGE_MISC_ALLDATE;
	}

	//all attribute loaded: append
	da_flt_insert(entry);
}


static void homebank_load_xml_tag(ParseContext *ctx, const gchar **attribute_names, const gchar **attribute_values)
{
Tag *entry = da_tag_malloc();
gint i;

	for (i = 0; attribute_names[i] != NULL; i++)
	{
		//DB( g_print(" att='%s' val='%s'\n", attribute_names[i], attribute_values[i]) );

		     if(!strcmp (attribute_names[i], "key"  )) { entry->key = atoi(attribute_values[i]); }
		//else if(!strcmp (attribute_names[i], "flags")) { entry->flags = atoi(attribute_values[i]); }
		else if(!strcmp (attribute_names[i], "name" )) { entry->name = g_strdup(attribute_values[i]); }
	}

	//all attribute loaded: append
	da_tag_insert(entry);
}


static void homebank_load_xml_fav(ParseContext *ctx, const gchar **attribute_names, const gchar **attribute_values)
{
Archive *entry = da_archive_malloc();
gchar *scat = NULL;
gchar *samt = NULL;
gchar *smem = NULL;
gboolean split = FALSE;
gint i;

	for (i = 0; attribute_names[i] != NULL; i++)
	{
		//DB( g_print(" att='%s' val='%s'\n", attribute_names[i], attribute_values[i]) );

		     if(!strcmp (attribute_names[i], "key"        )) { entry->key = atoi(attribute_values[i]); }
		else if(!strcmp (attribute_names[i], "amount"     )) { entry->amount = g_ascii_strtod(attribute_values[i], NULL); }
		else if(!strcmp (attribute_names[i], "account"    )) { entry->kacc = atoi(attribute_values[i]); }
		//#1673260
		else if(!strcmp (attribute_names[i], "damt"      )) { entry->xferamount = g_ascii_strtod(attribute_values[i], NULL); }
		else if(!strcmp (attribute_names[i], "dst_account")) { entry->kxferacc = atoi(attribute_values[i]); }
		else if(!strcmp (attribute_names[i], "paymode"    )) { entry->paymode = atoi(attribute_values[i]); }
		else if(!strcmp (attribute_names[i], "grpflg"     )) { entry->grpflg = atoi(attribute_values[i]); }
		else if(!strcmp (attribute_names[i], "st"         )) { entry->status = atoi(attribute_values[i]); }
		else if(!strcmp (attribute_names[i], "flags"      )) { entry->flags = atoi(attribute_values[i]); }
		else if(!strcmp (attribute_names[i], "payee"      )) { entry->kpay = atoi(attribute_values[i]); }
		else if(!strcmp (attribute_names[i], "category"   )) { entry->kcat = atoi(attribute_values[i]); }
		else if(!strcmp (attribute_names[i], "wording"    )) { if(strcmp(attribute_values[i],"(null)") && attribute_values[i] != NULL) entry->memo = g_strdup(attribute_values[i]); }
		else if(!strcmp (attribute_names[i], "info"       )) { if(strcmp(attribute_values[i],"(null)") && attribute_values[i] != NULL) entry->number = g_strdup(attribute_values[i]); }
		else if(!strcmp (attribute_names[i], "tags"       ))
		{
			if(attribute_values[i] != NULL && strlen(attribute_values[i]) > 0 && strcmp(attribute_values[i],"(null)") != 0 )
			{
				entry->tags = tags_parse(attribute_values[i]);
			}
		}

		else if(!strcmp (attribute_names[i], "recflg"     )) { entry->rec_flags = atoi(attribute_values[i]); }
		else if(!strcmp (attribute_names[i], "nextdate"   )) { entry->nextdate = atoi(attribute_values[i]); }
		else if(!strcmp (attribute_names[i], "every"      )) { entry->rec_every = atoi(attribute_values[i]); }
		else if(!strcmp (attribute_names[i], "unit"       )) { entry->rec_freq = atoi(attribute_values[i]); }
		else if(!strcmp (attribute_names[i], "limit"      )) { entry->limit = atoi(attribute_values[i]); }
		else if(!strcmp (attribute_names[i], "weekend"    )) { entry->weekend = atoi(attribute_values[i]); }
		else if(!strcmp (attribute_names[i], "gap"        )) { entry->daygap = atoi(attribute_values[i]); }
		else if(!strcmp (attribute_names[i], "ordn"       )) { entry->rec_ordinal = atoi(attribute_values[i]); }
		else if(!strcmp (attribute_names[i], "wkdy"       )) { entry->rec_weekday = atoi(attribute_values[i]); }

		else if(!strcmp (attribute_names[i], "scat" 	  )) { scat = (gchar *)attribute_values[i]; split = TRUE; }
		else if(!strcmp (attribute_names[i], "samt"       )) { samt = (gchar *)attribute_values[i]; split = TRUE; }
		else if(!strcmp (attribute_names[i], "smem"       )) { smem = (gchar *)attribute_values[i]; split = TRUE; }

	}

	if(split == TRUE)
	{
		entry->splits = da_split_new ();
		if (da_splits_parse(entry->splits, scat, samt, smem) > 0)
		{
			entry->flags |= OF_SPLIT; //Flag that Splits are active
		}
	}

	//all attribute loaded: append
	//GLOBALS->arc_list = g_list_append(GLOBALS->arc_list, entry);
	da_archive_append(entry);
}


static void homebank_load_xml_ope(ParseContext *ctx, const gchar **attribute_names, const gchar **attribute_values)
{
Transaction *entry = da_transaction_malloc();
gchar *scat = NULL;
gchar *samt = NULL;
gchar *smem = NULL;
gboolean split = FALSE;
gint i;

	for (i = 0; attribute_names[i] != NULL; i++)
	{
		//DB( g_print(" att='%s' val='%s'\n", attribute_names[i], attribute_values[i]) );

		     if(!strcmp (attribute_names[i], "date"       )) { entry->date = atoi(attribute_values[i]); }
		else if(!strcmp (attribute_names[i], "amount"     )) { entry->amount = g_ascii_strtod(attribute_values[i], NULL); }
		else if(!strcmp (attribute_names[i], "account"    )) { entry->kacc = atoi(attribute_values[i]); }
		//#1673260
		else if(!strcmp (attribute_names[i], "damt"      )) { entry->xferamount = g_ascii_strtod(attribute_values[i], NULL); }
		else if(!strcmp (attribute_names[i], "dst_account")) { entry->kxferacc = atoi(attribute_values[i]); }
		else if(!strcmp (attribute_names[i], "paymode"    )) { entry->paymode = atoi(attribute_values[i]); }
		else if(!strcmp (attribute_names[i], "grpflg"     )) { entry->grpflg = atoi(attribute_values[i]); }
		else if(!strcmp (attribute_names[i], "st"         )) { entry->status = atoi(attribute_values[i]); }
		else if(!strcmp (attribute_names[i], "flags"      )) { entry->flags = atoi(attribute_values[i]); }
		else if(!strcmp (attribute_names[i], "payee"      )) { entry->kpay = atoi(attribute_values[i]); }
		else if(!strcmp (attribute_names[i], "category"   )) { entry->kcat = atoi(attribute_values[i]); }
		else if(!strcmp (attribute_names[i], "wording"    )) { if(strcmp(attribute_values[i],"(null)") && attribute_values[i] != NULL) entry->memo = g_strdup(attribute_values[i]); }
		else if(!strcmp (attribute_names[i], "info"       )) { if(strcmp(attribute_values[i],"(null)") && attribute_values[i] != NULL) entry->number = g_strdup(attribute_values[i]); }
		else if(!strcmp (attribute_names[i], "tags"       ))
		{
			if(attribute_values[i] != NULL && strlen(attribute_values[i]) > 0 && strcmp(attribute_values[i],"(null)") != 0 )
			{
				entry->tags = tags_parse(attribute_values[i]);
			}
		}
		else if(!strcmp (attribute_names[i], "kxfer"    )) { entry->kxfer = atoi(attribute_values[i]); }
		else if(!strcmp (attribute_names[i], "scat"     )) { scat = (gchar *)attribute_values[i]; split = TRUE; }
		else if(!strcmp (attribute_names[i], "samt"     )) { samt = (gchar *)attribute_values[i]; split = TRUE; }
		else if(!strcmp (attribute_names[i], "smem"     )) { smem = (gchar *)attribute_values[i]; split = TRUE; }
	}

	//bugfix 303886
	//if(entry->kcat < 0)
	//	entry->kcat = 0;

	if(split == TRUE)
	{
		entry->splits = da_split_new ();
		if (da_splits_parse(entry->splits, scat, samt, smem) > 0)
		{
			entry->flags |= OF_SPLIT; //Flag that Splits are active
		}
	}
	
	//all attribute loaded: append
	// for perf reason we use prepend here, the list will be reversed later 
	da_transaction_prepend(entry);
}




static void
start_element_handler (GMarkupParseContext *context,
		       const gchar         *element_name,
		       const gchar        **attribute_names,
		       const gchar        **attribute_values,
		       gpointer             user_data,
		       GError             **error)
{
ParseContext *ctx = user_data;
//GtkUIManager *self = ctx->self;

	//DB( g_print("** start element: '%s'\n", element_name) );

	switch(element_name[0])
	{
		case 'a':
		{
			if(!strcmp (element_name, "account"))   //account
			{
				homebank_load_xml_acc(ctx, attribute_names, attribute_values);
			}
			else if(!strcmp (element_name, "asg"))  //assign
			{
				homebank_load_xml_asg(ctx, attribute_names, attribute_values);
			}
		}
		break;

		case 'p':
		{
			if(!strcmp (element_name, "pay"))
			{
				homebank_load_xml_pay(ctx, attribute_names, attribute_values);
			}
			else if(!strcmp (element_name, "properties"))
			{
				homebank_load_xml_prop(ctx, attribute_names, attribute_values);
			}
		}
		break;

		case 'g':
		{
			if(!strcmp (element_name, "grp"))
			{
				homebank_load_xml_grp(ctx, attribute_names, attribute_values);
			}
		}
		break;
			
		case 'c':
		{
			if(!strcmp (element_name, "cat"))
			{
				homebank_load_xml_cat(ctx, attribute_names, attribute_values);
			}
			else if(!strcmp (element_name, "cur"))
			{
				homebank_load_xml_cur(ctx, attribute_names, attribute_values);
			}
		}
		break;

		//TODO: < 5.2 misstyped here, should be tag without a s
		//commented > 5.2 useless not loaded, but no side effect
		case 't':
		{
			if(!strcmp (element_name, "tag"))
			{
				homebank_load_xml_tag(ctx, attribute_names, attribute_values);
			}
		}
		break;

		case 'f':
		{
			if(!strcmp (element_name, "fav"))
			{
				homebank_load_xml_fav(ctx, attribute_names, attribute_values);
			}
			else if(!strcmp (element_name, "flt"))
			{
				homebank_load_xml_flt(ctx, attribute_names, attribute_values);
			}
		}
		break;

		case 'o':
		{
			if(!strcmp (element_name, "ope"))
			{
				homebank_load_xml_ope(ctx, attribute_names, attribute_values);
			}
		}
		break;
	}
}


/*
static void
end_element_handler (GMarkupParseContext *context,
		     const gchar         *element_name,
		     gpointer             user_data,
		     GError             **error)
{
  ParseContext *ctx = user_data;

	//DB( g_print("-- end element: %s\n", element_name) );


}
*/

static GMarkupParser hb_parser = {
	start_element_handler,
	NULL,	//end_element_handler,
	NULL, //text_handler,
	NULL,
	NULL  //cleanup
};


static gboolean hb_xml_get_version(ParseContext *ctx, gchar *buffer)
{
gchar *v_buffer;

	ctx->file_version = 0.0;
	ctx->data_version = 0;

	/* v3.4 add :: prevent load of future file version */
	v_buffer = g_strstr_len(buffer, 50, "<homebank v=");
	if( v_buffer == NULL )
		return FALSE;

	DB( g_print("- id line: --(%.50s)\n\n", v_buffer) );

	ctx->file_version = g_ascii_strtod(v_buffer+13, NULL);	/* a little hacky, but works ! */
	if( ctx->file_version == 0.0 ) 
		ctx->file_version = 0.1;
	else if( ctx->file_version == 5.0 ) //was a mistake
		ctx->file_version = 1.0;

	v_buffer = g_strstr_len(buffer+13, 50, "d=");
	if( v_buffer )
	{
		//TODO: beware here of we display all the file...
		DB( g_print(" d=%.25s)\n\n", v_buffer) );
	
		ctx->data_version = atoi(v_buffer+3);
	}
	return TRUE;
}


/*
** XML load homebank file: hbfile
*/
gint homebank_load_xml(gchar *filename)
{
gint retval;
gchar *buffer;
gsize length;
GError *error = NULL;
ParseContext ctx;
GMarkupParseContext *context;
gboolean rc, dosanity;

	DB( g_print("\n[hb-xml] homebank_load_xml\n") );

	retval = XML_OK;
	if (!g_file_get_contents (filename, &buffer, &length, &error))
	{
		if(error)
		{
			g_warning("unable to load file %s: %s", filename, error->message);
			g_error_free(error);
			retval = XML_IO_ERROR;
		}
	}
	else
	{
		if( hb_xml_get_version(&ctx, buffer) == FALSE )
			return XML_FILE_ERROR;
		
		if( ctx.file_version > FILE_VERSION )
			return XML_VERSION_ERROR;

		DB( g_print("- file ok : v=%.1f data_v=%06d\n", ctx.file_version, ctx.data_version) );

		/* 1st: validate the file is well in utf-8 */

		buffer = homebank_utf8_ensure(buffer);

		/* then process the buffer */
		context = g_markup_parse_context_new (&hb_parser, 0, &ctx, NULL);

		error = NULL;
		rc = g_markup_parse_context_parse (context, buffer, length, &error);

		if( error )
		{
			g_print("failed: %s\n", error->message);
			g_error_free (error);
		}
			
		if( rc == FALSE )
		{
			error = NULL;
			g_markup_parse_context_end_parse(context, &error);

			if(error)
			{
				g_print("failed: %s\n", error->message);
				g_error_free (error);
			}
		}

		g_markup_parse_context_free (context);
		g_free (buffer);

		/* file upgrade / bugfix */
		dosanity = FALSE;
		// group a test for very old version
		if( ctx.file_version <= 1.0 )
		{
			if( ctx.file_version <= 0.1 )
				homebank_upgrade_to_v02();
			if( ctx.file_version <= 0.2 )
				homebank_upgrade_to_v03();
			if( ctx.file_version <= 0.3 )
				homebank_upgrade_to_v04();
			if( ctx.file_version <= 0.4 )
				homebank_upgrade_to_v05();
			if( ctx.file_version <= 0.5 )
			{
				homebank_upgrade_to_v06();
				homebank_upgrade_lower_v06();
			}
			if( ctx.file_version <= 0.6 )
			{
				homebank_upgrade_to_v07();
				hbfile_sanity_check();
			}
			if( ctx.file_version <= 0.7 )	// <= 4.5
			{	
				homebank_upgrade_to_v08();
			}
			if( ctx.file_version <= 0.8 )	// <= 4.6
			{
				dosanity = TRUE;
			}
			if( ctx.file_version <= 0.9 )	// <= 4.6.3 - 2014-08-09
			{
				homebank_upgrade_to_v10();
				dosanity = TRUE;
			}
			if( ctx.file_version <= 1.0 )	// <= 5.0.0
			{
				homebank_upgrade_to_v11();
				dosanity = TRUE;
			}
		}			

		//starting 5.0.4 data upgrade is done without changing file_version
		//file version is changed only when the structure change
		//don't start number below with 0 to avoid octal interpretation
		if( ctx.data_version <= 50005 )	// <= 5.0.5 
		{
			dosanity = TRUE;
		}
		if( ctx.file_version <= 1.1 )	// <= 5.1.0
		{
			homebank_upgrade_to_v12();
			dosanity = TRUE;
		}
		if( ctx.data_version <= 50106 )	// < 5.1.6
		{
			homebank_upgrade_to_v12_7();
		}
		if( ctx.file_version < 1.3 )	// <= 5.2 
		{
			homebank_upgrade_to_v13();
			dosanity = TRUE;
		}
		if( ctx.data_version <= 50203 )
		{
			//fix payee defaut payment to int xfer from 5.1
			dosanity = TRUE;
		}
		if( ctx.file_version < 1.4 )	// <= 5.3 
		{
			homebank_upgrade_to_v14();
			dosanity = TRUE;
		}
		if( ctx.data_version < 50402 ) 
			//fix income txn flag that may be incorrect (multiple edit)
			dosanity = TRUE;

		if( ctx.data_version < 50600 ) 
			homebank_upgrade_to_v14_12();

		if( ctx.data_version < 50604 ) 
			//#2018414 tag name replace any space by -
			dosanity = TRUE;

		if( ctx.data_version < 50900 )
			homebank_upgrade_to_v14_59();

		if( ctx.data_version == 50900 || ctx.data_version == 50901 )
			//fix arc bad limit
			homebank_upgrade_to_v14_592();

		if( ctx.data_version < 50904 )
			homebank_upgrade_to_v14_595();		

		// next ?


		// sanity check at last
		if( dosanity == TRUE )
			hbfile_sanity_check();

	}

	return retval;
}


/* = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = */


/*
** XML properties save
*/
static GError *
homebank_save_xml_prop(GIOChannel *io)
{
gchar *title;
GString *node;
GError *error = NULL;

	title = GLOBALS->owner == NULL ? "" : GLOBALS->owner;

	node = g_string_sized_new(255);

	g_string_assign(node, "<properties");
	
	hb_xml_append_txt(node, "title", title);
	hb_xml_append_int(node, "curr", GLOBALS->kcur);
	hb_xml_append_int(node, "car_category", GLOBALS->vehicle_category);
	hb_xml_append_int0(node, "auto_smode", GLOBALS->auto_smode);
	hb_xml_append_int(node, "auto_weekday", GLOBALS->auto_weekday);
	hb_xml_append_int(node, "auto_nbmonths", GLOBALS->auto_nbmonths);
	hb_xml_append_int(node, "auto_nbdays", GLOBALS->auto_nbdays);
	hb_xml_append_amt(node, "earnbyh", GLOBALS->lifen_earnbyh);

	g_string_append(node, "/>\n");

	g_io_channel_write_chars(io, node->str, -1, NULL, &error);
	g_string_free(node, TRUE);

	return error;
}


/*
** XML currency save
*/
static GError *
homebank_save_xml_cur(GIOChannel *io)
{
GList *list;
gchar *tmpstr;
char buf1[G_ASCII_DTOSTR_BUF_SIZE];
GError *error = NULL;

	list = g_hash_table_get_values(GLOBALS->h_cur);
	while (list != NULL)
	{
	Currency *item = list->data;

		tmpstr = g_markup_printf_escaped(
		    "<cur key=\"%d\" flags=\"%d\" iso=\"%s\" name=\"%s\" symb=\"%s\" syprf=\"%d\" dchar=\"%s\" gchar=\"%s\" frac=\"%d\" rate=\"%s\" mdate=\"%d\"/>\n",
			item->key,
			item->flags,
			item->iso_code,
		    item->name,
		    item->symbol,
		    item->sym_prefix,
		    item->decimal_char,
		    item->grouping_char,
		    item->frac_digits,
		    g_ascii_dtostr (buf1, sizeof (buf1), item->rate),
		    item->mdate
		);

		g_io_channel_write_chars(io, tmpstr, -1, NULL, &error);
		g_free(tmpstr);
		if(error)
			goto curfail;

		list = g_list_next(list);
	}

curfail:
	g_list_free(list);
	return error;
}


/*
** XML account save
*/
static GError *
homebank_save_xml_acc(GIOChannel *io)
{
GList *lacc, *list;
GString *node;
GError *error = NULL;

	node = g_string_sized_new(255);

	lacc = list = account_glist_sorted(HB_GLIST_SORT_KEY);
	while (list != NULL)
	{
	Account *item = list->data;

		item->dspflags &= ~(FLAG_ACC_TMP_ADDED|FLAG_ACC_TMP_EDITED);	//delete flag

		g_string_assign(node, "<account");
		
		hb_xml_append_int(node, "key", item->key);
		hb_xml_append_int(node, "flags", item->flags);
		hb_xml_append_int(node, "pos", item->pos);
		hb_xml_append_int(node, "type", item->type);
		hb_xml_append_int(node, "curr", item->kcur);
		hb_xml_append_txt(node, "name", item->name);
		hb_xml_append_txt(node, "number", item->number);
		hb_xml_append_txt(node, "bankname", item->bankname);
		hb_xml_append_amt(node, "initial", item->initial);

		hb_xml_append_amt(node, "minimum", item->minimum);
		hb_xml_append_amt(node, "maximum", item->maximum);
		hb_xml_append_int(node, "cheque1", item->cheque1);
		hb_xml_append_int(node, "cheque2", item->cheque2);
		hb_xml_append_txt(node, "website", item->website);
		hb_xml_append_txt_crlf(node, "notes", item->notes);
		hb_xml_append_int(node, "tpl", item->karc);
		hb_xml_append_int(node, "grp", item->kgrp);
		//5.5
		hb_xml_append_int(node, "ccday", item->cccday);
		hb_xml_append_int(node, "rdate", item->rdate);

		g_string_append(node, "/>\n");

		g_io_channel_write_chars(io, node->str, -1, NULL, &error);
		if(error)
			goto accfail;

		list = g_list_next(list);
	}

accfail:
	g_list_free(lacc);
	g_string_free(node, TRUE);
	return error;
}

/*
** XML payee save
*/
static GError *
homebank_save_xml_pay(GIOChannel *io)
{
GList *lpay, *list;
GString *node;
GError *error = NULL;

	node = g_string_sized_new(255);

	lpay = list = payee_glist_sorted(HB_GLIST_SORT_KEY);
	while (list != NULL)
	{
	Payee *item = list->data;

		if(item->key != 0)
		{
			g_string_assign(node, "<pay");

			hb_xml_append_int(node, "key", item->key);
			hb_xml_append_int(node, "flags", item->flags);
			hb_xml_append_txt(node, "name", item->name);
			hb_xml_append_int(node, "category", item->kcat);
			hb_xml_append_int(node, "paymode" , item->paymode);
			hb_xml_append_txt_crlf(node, "notes", item->notes);

			g_string_append(node, "/>\n");

			g_io_channel_write_chars(io, node->str, -1, NULL, &error);
			if(error)
				goto payfail;
		}
		list = g_list_next(list);
	}

payfail:
	g_list_free(lpay);
	g_string_free(node, TRUE);
	return error;
}


/*
** XML category save
*/
static GError *
homebank_save_xml_cat(GIOChannel *io)
{
GList *lcat, *list;
GString *node;
char buf[G_ASCII_DTOSTR_BUF_SIZE];
GError *error = NULL;

	node = g_string_sized_new(255);

	lcat = list = category_glist_sorted(HB_GLIST_SORT_KEY);
	while (list != NULL)
	{
	Category *item = list->data;
	guint i;

		if(item->key != 0)
		{
			g_string_assign(node, "<cat");
		
			hb_xml_append_int(node, "key", item->key);
			hb_xml_append_int(node, "parent", item->parent);
			hb_xml_append_int(node, "flags", item->flags);
			hb_xml_append_txt(node, "name", item->name);	

			for(i=0;i<=12;i++)
			{
				if(item->budget[i] != 0)
				{
					g_string_append_printf(node," b%d=\"%s\"", i, g_ascii_dtostr (buf, sizeof (buf), item->budget[i]));
				}
			}

			g_string_append(node, "/>\n");
			
			g_io_channel_write_chars(io, node->str, -1, NULL, &error);
			if(error)
				goto catfail;
		}
		list = g_list_next(list);
	}

catfail:
	g_list_free(lcat);
	g_string_free(node, TRUE);
	return error;
}


/*
** XML grp save
*/
static GError *
homebank_save_xml_grp(GIOChannel *io)
{
GList *lgrp, *list;
gchar *tmpstr;
GError *error = NULL;

	lgrp = list = group_glist_sorted(HB_GLIST_SORT_KEY);
	while (list != NULL)
	{
	Group *item = list->data;

		if(item->key != 0)
		{
			//tmpstr = g_markup_printf_escaped("<grp key=\"%d\" type=\"%d\" name=\"%s\"/>\n",
			tmpstr = g_markup_printf_escaped("<grp key=\"%d\" name=\"%s\"/>\n",
				item->key,
			    //item->type,
				item->name
			);

			g_io_channel_write_chars(io, tmpstr, -1, NULL, &error);
			g_free(tmpstr);
			if(error)
				goto grpfail;
		}
		list = g_list_next(list);
	}

grpfail:
	g_list_free(lgrp);
	return error;
}


/*
** XML filter save
*/
static GError *
homebank_save_xml_flt(GIOChannel *io)
{
GList *lflt, *list;
GString *node;
GError *error = NULL;

	node = g_string_sized_new(255);

	lflt = list = filter_glist_sorted(HB_GLIST_SORT_KEY);
	while (list != NULL)
	{
	Filter *item = list->data;

		if(item->key != 0)
		{
			g_string_assign(node, "<flt");
		
			hb_xml_append_int(node, "key", item->key);
			//hb_xml_append_int(node, "parent", item->parent);
			//hb_xml_append_int(node, "flags", item->flags);

			hb_xml_append_fltgroup(node, "dat", item, FLT_GRP_DATE);
			hb_xml_append_fltgroup(node, "acc", item, FLT_GRP_ACCOUNT);
			hb_xml_append_fltgroup(node, "pay", item, FLT_GRP_PAYEE);
			hb_xml_append_fltgroup(node, "cat", item, FLT_GRP_CATEGORY);
			hb_xml_append_fltgroup(node, "tag", item, FLT_GRP_TAG);
			hb_xml_append_fltgroup(node, "txt", item, FLT_GRP_TEXT);
			hb_xml_append_fltgroup(node, "amt", item, FLT_GRP_AMOUNT);
			hb_xml_append_fltgroup(node, "mod", item, FLT_GRP_PAYMODE);
			hb_xml_append_fltgroup(node, "sta", item, FLT_GRP_STATUS);
			hb_xml_append_fltgroup(node, "typ", item, FLT_GRP_TYPE);

			hb_xml_append_txt(node, "name", item->name);

			g_string_append(node, "/>\n");

			g_io_channel_write_chars(io, node->str, -1, NULL, &error);
			if(error)
				goto fltfail;
		}
		list = g_list_next(list);
	}

fltfail:
	g_list_free(lflt);
	g_string_free(node, TRUE);
	return error;
}



/*
** XML tag save
*/
static GError *
homebank_save_xml_tag(GIOChannel *io)
{
GList *ltag, *list;
gchar *tmpstr;
GError *error = NULL;

	ltag = list = tag_glist_sorted(HB_GLIST_SORT_KEY);
	while (list != NULL)
	{
	Tag *item = list->data;

		if(item->key != 0)
		{
			tmpstr = g_markup_printf_escaped("<tag key=\"%d\" name=\"%s\"/>\n",
				item->key,
				item->name
			);

			g_io_channel_write_chars(io, tmpstr, -1, NULL, &error);
			g_free(tmpstr);
			if(error)
				goto tagfail;
		}
		list = g_list_next(list);
	}

tagfail:
	g_list_free(ltag);
	return error;
}


/*
** XML assign save
*/
static GError *
homebank_save_xml_asg(GIOChannel *io)
{
GList *lasg, *list;
GString *node;
GError *error = NULL;

	node = g_string_sized_new(255);
	
	lasg = list = assign_glist_sorted(HB_GLIST_SORT_KEY);
	while (list != NULL)
	{
	Assign *item = list->data;
	gchar *tagstr = tags_tostring(item->tags);

		//#2018680
		item->flags &= ~(ASGF_PREFILLED);	//delete flag

		g_string_assign(node, "<asg");

		hb_xml_append_int(node, "key"     , item->key);
		hb_xml_append_int(node, "flags"   , item->flags);
		hb_xml_append_int(node, "pos"     , item->pos);
		hb_xml_append_int(node, "field"   , item->field);
		hb_xml_append_txt(node, "name"    , item->search);
		hb_xml_append_txt(node, "notes"   , item->notes);	
		hb_xml_append_int(node, "payee"   , item->kpay);
		hb_xml_append_int(node, "category", item->kcat);
		hb_xml_append_int(node, "paymode" , item->paymode);
		//#1999879 assignment by amount do not save
		hb_xml_append_amt(node, "amount", item->amount);
		hb_xml_append_txt(node, "tags", tagstr);

		g_string_append(node, "/>\n");
		
		g_io_channel_write_chars(io, node->str, -1, NULL, &error);
		if(error)
			goto asgfail;

		list = g_list_next(list);
	}

asgfail:
	g_list_free(lasg);
	g_string_free(node, TRUE);
	return error;
}


/*
** XML archive save
*/
static GError *
homebank_save_xml_fav(GIOChannel *io)
{
GList *list;
GString *node;
GError *error = NULL;

	node = g_string_sized_new(255);

	list = da_archive_glist_sorted(HB_GLIST_SORT_KEY);
	while (list != NULL)
	{
	Archive *item = list->data;
	gchar *tagstr = tags_tostring(item->tags);

		g_string_assign(node, "<fav");

		hb_xml_append_int(node, "key", item->key);
		hb_xml_append_amt(node, "amount", item->amount);
		hb_xml_append_int(node, "account", item->kacc);
		//#1673260
		if( item->flags & OF_ADVXFER )
			hb_xml_append_amt(node, "damt", item->xferamount);
		hb_xml_append_int(node, "dst_account", item->kxferacc);
		hb_xml_append_int(node, "paymode", item->paymode);
		hb_xml_append_int(node, "grpflg", item->grpflg);
		hb_xml_append_int(node, "st", item->status);
		hb_xml_append_int(node, "flags", item->flags);
		hb_xml_append_int(node, "payee", item->kpay);
		hb_xml_append_int(node, "category", item->kcat);
		hb_xml_append_txt(node, "wording", item->memo);
		hb_xml_append_txt(node, "info", item->number);	
		hb_xml_append_txt(node, "tags", tagstr);

		hb_xml_append_int(node, "recflg", item->rec_flags);
		hb_xml_append_int(node, "nextdate", item->nextdate);
		hb_xml_append_int(node, "every", item->rec_every);
		hb_xml_append_int(node, "unit", item->rec_freq);
		if(item->rec_flags & TF_LIMIT)
		{
			hb_xml_append_int(node, "limit", item->limit);
		}	
		hb_xml_append_int(node, "weekend", item->weekend);
		hb_xml_append_int(node, "gap", item->daygap);
		if(item->rec_flags & TF_RELATIVE)
		{
			hb_xml_append_int(node, "ordn", item->rec_ordinal);
			hb_xml_append_int(node, "wkdy", item->rec_weekday);
		}

		if(da_splits_length(item->splits) > 0)
		{
		gchar *cats, *amounts, *memos;
		
			da_splits_tostring(item->splits, &cats, &amounts, &memos);
			g_string_append_printf(node, " scat=\"%s\"", cats);
			g_string_append_printf(node, " samt=\"%s\"", amounts);

			//fix #1173910
			gchar *escaped = g_markup_escape_text(memos, -1);
			g_string_append_printf(node, " smem=\"%s\"", escaped);
			g_free(escaped);

			g_free(cats);
			g_free(amounts);
			g_free(memos);
		}

		g_string_append(node, "/>\n");
		
		g_free(tagstr);

		g_io_channel_write_chars(io, node->str, -1, NULL, &error);
		if(error)
			goto favfail;

		list = g_list_next(list);
	}

favfail:
	//no list free here it is already the global list
	g_string_free(node, TRUE);
	return error;
}


/*
** XML transaction save
*/
static GError *
homebank_save_xml_ope(GIOChannel *io)
{
GList *lst_acc, *lnk_acc;
GList *list;
GString *node;
GError *error = NULL;

	node = g_string_sized_new(255);

	lst_acc = g_hash_table_get_values(GLOBALS->h_acc);
	lnk_acc = g_list_first(lst_acc);
	while (lnk_acc != NULL)
	{
	Account *acc = lnk_acc->data;

		list = g_queue_peek_head_link(acc->txn_queue);
		while (list != NULL)
		{
		Transaction *item = list->data;
		gchar *tagstr = tags_tostring(item->tags);

			item->dspflags = 0;

			g_string_assign(node, "<ope");
		
			hb_xml_append_int(node, "date", item->date);
			hb_xml_append_amt(node, "amount", item->amount);
			hb_xml_append_int(node, "account", item->kacc);
			//#1673260
			if( item->flags & OF_ADVXFER )
				hb_xml_append_amt(node, "damt", item->xferamount);
			hb_xml_append_int(node, "dst_account", item->kxferacc);
			hb_xml_append_int(node, "paymode", item->paymode);
			hb_xml_append_int(node, "grpflg", item->grpflg);
			hb_xml_append_int(node, "st", item->status);
			hb_xml_append_int(node, "flags", item->flags);
			hb_xml_append_int(node, "payee", item->kpay);
			hb_xml_append_int(node, "category", item->kcat);
			hb_xml_append_txt(node, "wording", item->memo);	
			hb_xml_append_txt(node, "info", item->number);	
			hb_xml_append_txt(node, "tags", tagstr);	
			hb_xml_append_int(node, "kxfer", item->kxfer);

			if(da_splits_length(item->splits) > 0)
			{
			gchar *cats, *amounts, *memos;
		
				da_splits_tostring(item->splits, &cats, &amounts, &memos);
				g_string_append_printf(node, " scat=\"%s\"", cats);
				g_string_append_printf(node, " samt=\"%s\"", amounts);

				//fix #1173910
				gchar *escaped = g_markup_escape_text(memos, -1);
				g_string_append_printf(node, " smem=\"%s\"", escaped);
				g_free(escaped);

				g_free(cats);
				g_free(amounts);
				g_free(memos);
			}

			g_string_append(node, "/>\n");

			g_free(tagstr);
		
			g_io_channel_write_chars(io, node->str, -1, NULL, &error);
			if(error)
				goto opefail;

			list = g_list_next(list);
		}
		
		lnk_acc = g_list_next(lnk_acc);
	}

opefail:
	g_list_free(lst_acc);

	g_string_free(node, TRUE);
	return error;
}


static GError *
homebank_save_xml_ver(GIOChannel *io)
{
GError *error = NULL;
char buf1[G_ASCII_DTOSTR_BUF_SIZE];
gchar *outstr;

	g_ascii_dtostr (buf1, sizeof (buf1), FILE_VERSION);
	outstr = g_strdup_printf("<homebank v=\"%s\" d=\"%06d\">\n", buf1, HB_VERSION_NUM);
	g_io_channel_write_chars(io, outstr, -1, NULL, &error);
	g_free(outstr);

	return error;
}


/*
** XML save homebank file: hbfile
*/
gint homebank_save_xml(gchar *filename)
{
GIOChannel *io;
GError *error = NULL;
gint retval = XML_IO_ERROR;

	//The default encoding for the external file is UTF-8.
	io = g_io_channel_new_file(filename, "w", &error);
	if(error) goto failure;

	//#2069152 handle windows Controlled Folder Access (CFA) write access 
	if( !(g_io_channel_get_flags(io) & G_IO_FLAG_IS_WRITABLE) )
	{
		retval = XML_NOT_WRITABLE;
		goto failure;
	}

	g_io_channel_write_chars(io, "<?xml version=\"1.0\"?>\n", -1, NULL, &error);
	if(error) goto failure;

	error = homebank_save_xml_ver(io);
	if(error) goto failure;

	error = homebank_save_xml_prop(io);
	if(error) goto failure;

	error = homebank_save_xml_cur(io);
	if(error) goto failure;

	error = homebank_save_xml_grp(io);
	if(error) goto failure;

	error = homebank_save_xml_acc(io);
	if(error) goto failure;

	error = homebank_save_xml_pay(io);
	if(error) goto failure;

	error = homebank_save_xml_cat(io);
	if(error) goto failure;

	error = homebank_save_xml_tag(io);
	if(error) goto failure;

	error = homebank_save_xml_asg(io);
	if(error) goto failure;

	error = homebank_save_xml_fav(io);
	if(error) goto failure;

	error = homebank_save_xml_ope(io);
	if(error) goto failure;

	error = homebank_save_xml_flt(io);
	if(error) goto failure;

	g_io_channel_write_chars(io, "</homebank>\n", -1, NULL, &error);
	if(error) goto failure;

	retval = XML_OK;

failure:
	if(error)
	{
		g_warning("unable to save file %s: %s", filename, error->message);
		//TODO: later: propagate up
		g_error_free(error);
	}

	g_io_channel_unref (io);

	return retval;
}

