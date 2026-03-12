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

#ifndef __HB_ACCOUNT_H__
#define __HB_ACCOUNT_H__

#include "hb-types.h"

struct _account
{
	guint32		key;
	gushort		flags;
	gushort		type;
	guint32		pos;		//display position
	guint32		kcur;
	gchar		*name;
	gchar		*number;
	gchar		*bankname;
	guint32		kgrp;
	gdouble		initial;
	//gdouble		warning;
	gdouble		minimum;
	gdouble		maximum;
	guint32		cheque1;
	guint32		cheque2;
	gchar		*website;		//5.7 add
	gchar	    *notes;
	guint32		karc;
	guint16		cccday;		//creditcard close day
	guint32		rdate;		//last reconciled date

	/* unsaved datas */
	GQueue		*txn_queue;

	gushort		dspflags;	
	gushort		nb_pending;	//5.9

	gdouble     bal_recon;	//bank balance (reconciled transaction)
	gdouble		bal_clear;	//cleared
	gdouble     bal_today;	//today balance (every transaction until today)
	gdouble     bal_future;	//future balance (every transaction)

	gchar		*xferincname;	//xfer payee display name: '< account'
	gchar		*xferexpname;	//xfer payee display name: '> account'

	//gboolean	flt_select;		//true if selected into filter
};


// data flags
//gushort is 2 bytes / 16 bits
//FREE (1<<0) 
#define AF_CLOSED		(1<<1)

#define AF_NOSUMMARY	(1<<4)
#define AF_NOBUDGET		(1<<5)
#define AF_NOREPORT		(1<<6)
#define AF_OUTFLOWSUM	(1<<7)

#define AF_HASNOTICE	(1<< 9) //added 5.9 for pending/import

//deprecated
#define AF_OLDBUDGET	(1<<0)

// unsaved flags -- display/session
#define FLAG_ACC_TMP_ADDED		(1<< 1)
#define FLAG_ACC_TMP_EDITED		(1<< 2)
#define FLAG_ACC_TMP_DIRTY		(1<< 3)	//indicate any display needs a refresh


enum
{
// + https://www.kashoo.com/blog/what-are-the-different-account-types-in-accounting/
// + AceMoney: Bank / Cash / Credit / Investment / Loan

	ACC_TYPE_NONE       = 0,
	ACC_TYPE_BANK       = 1,	//Banque
	ACC_TYPE_CASH       = 2,	//Espèce
	ACC_TYPE_ASSET      = 3,	//Actif (avoir)
	ACC_TYPE_CREDITCARD = 4,	//Carte crédit
	ACC_TYPE_LIABILITY  = 5,	//Passif (dettes)
	ACC_TYPE_CHECKING	= 6, 	//OFX A standard checking account
	ACC_TYPE_SAVINGS 	= 7,	//OFX A standard savings account
	//	OFX_MONEYMRKT 	OFX A money market account
	//	OFX_CREDITLINE 	OFX A line of credit
	//	OFX_INVESTMENT 	OFX An investment account
	//	ACC_TYPE_STOCK      = 11,	//Actions
	//ACC_TYPE_MUTUALFUND = 12,	//Fond de placement
	//ACC_TYPE_INCOME     = 13,	//Revenus
	//ACC_TYPE_EXPENSE    = 14,	//Dépenses
	//ACC_TYPE_EQUITY     = 15,	//Capitaux propres
//	ACC_TYPE_,
	ACC_TYPE_MAXVALUE
};


enum {
	ACC_USAGE_NONE,
	ACC_USAGE_TXN,
	ACC_USAGE_TXN_XFER,
	ACC_USAGE_ARC,
	ACC_USAGE_ARC_XFER
};


Account *da_acc_malloc(void);
void da_acc_free(Account *item);
Account *da_acc_malloc(void);

void da_acc_destroy(void);
void da_acc_new(void);

guint		da_acc_length(void);
gboolean	da_acc_create_none(void);
gboolean	da_acc_delete(guint32 key);
gboolean	da_acc_insert(Account *item);
gboolean	da_acc_append(Account *item);
guint32		da_acc_get_max_key(void);
Account		*da_acc_get_by_name(gchar *name);
Account		*da_acc_get_by_imp_name(gchar *name);
Account		*da_acc_get(guint32 key);
guint32		da_acc_get_first_key(void);
void da_acc_consistency(Account *item);
void da_acc_anonymize(Account *item);

void da_acc_pos_sanitize(void);

void account_transaction_sort(void);
guint account_is_used(guint32 key);
gboolean account_has_website(Account *item);
gboolean account_exists(gchar *name);
gboolean account_rename(Account *item, gchar *newname);
void account_set_currency(Account *item, guint32 kcur);

void account_set_dirty(Account *acc, guint32 key, gboolean isdirty);

void account_flags_eval(Account *item);
void account_compute_balances(gboolean init);
gboolean account_balances_add(Transaction *txn);
gboolean account_balances_sub(Transaction *txn);

GList *account_glist_sorted(gint column);

void account_convert_euro(Account *acc);
#endif
