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


#ifndef __HB_TRANSACTION_H__
#define __HB_TRANSACTION_H__


#include "hb-types.h"


struct _transaction
{
	gdouble		amount;
	guint32		kacc;
	guchar		paymode;
	guchar		grpflg;
	gushort		flags;
	guint32		kpay;
	guint32		kcat;
	gchar		*memo;

	guint32		date;
	gushort		pos;
	gushort     status;
	gchar		*number;	//info < 5.8
	guint32		*tags;
	guint32		kxfer;		//strong link xfer key
	guint32		kxferacc;
	gdouble		xferamount;	//xfer target amount

	GPtrArray	*splits;

	/* unsaved datas */
	guint32		kcur;		//init at loadxml (preprend) + add
	gushort		dspflags;	//
	guchar		dupgid;		//duplicate group id
	guchar		matchrate;	//used only when find xfer target
	gdouble		balance;	//init at dsp balance refresh
	//GList		*same;		//used for import todo: change this
};


// saved flags -- data
//gushort is 2 bytes / 16 bits
//FREE (1<<0) 
#define OF_INCOME	(1<< 1)
//FREE (1<< 2) 
#define OF_INTXFER	(1<< 3)
#define OF_ADVXFER  (1<< 4)	//xfer with != kcur
#define OF_REMIND	(1<< 5)	//added 5.9
#define OF_CHEQ2	(1<< 6)
//FREE (1<< 7)
#define OF_SPLIT	(1<< 8)
#define OF_ISIMPORT	(1<< 9) //added 5.9
#define OF_ISPAST	(1<<10) //added 5.9

//deprecated > 5.x
#define OLDF_VALID		(1<< 0)
#define OLDF_REMIND		(1<< 5)
//deprecated > 5.9
#define OLDF_AUTO		(1<< 2)	//scheduled
#define OLDF_LIMIT		(1<< 7)	//scheduled
#define OLDF_ADDED		(1<< 9) //was 1<<3 < 5.3
#define OLDF_CHANGED	(1<<10) //was 1<<4 < 5.3
#define OLDF_PREFILLED	(1<<11)


// unsaved flags -- display/session
#define FLAG_TMP_ADDED		(1<< 1)
#define FLAG_TMP_EDITED		(1<< 2)
#define FLAG_TMP_PREFILLED	(1<< 3) //scheduled
#define	FLAG_TMP_OVER		(1<< 4)
#define	FLAG_TMP_LOWBAL		(1<< 5)
#define	FLAG_TMP_DUPSRC		(1<< 9)
#define	FLAG_TMP_DUPDST		(1<<10)
#define	FLAG_TMP_CHKSIGN	(1<< 11)


typedef enum {
	TXN_STATUS_NONE,		//0
	TXN_STATUS_CLEARED,		//1
	TXN_STATUS_RECONCILED,	//2
	TXN_STATUS_VOID			//3 (OLD 4)
} HbTxnStatus;

#define TXN_OLDSTATUS_REMIND	3
#define TXN_OLDSTATUS_VOID		4


enum {
	TXN_MARK_NONE,
	TXN_MARK_DUPSRC,
	TXN_MARK_DUPDST
};

enum
{
	TXN_TYPE_EXPENSE,
	TXN_TYPE_INCOME,
	TXN_TYPE_INTXFER
};


Transaction *da_transaction_malloc(void);
//Transaction *da_transaction_copy(Transaction *src_txn, Transaction *dst_txn);
Transaction *da_transaction_init(Transaction *txn, guint32 kacc);
Transaction *da_transaction_init_from_template(Transaction *txn, Archive *arc);
Transaction *da_transaction_set_default_template(Transaction *txn);
Transaction *da_transaction_clone(Transaction *src_item);
void da_transaction_free(Transaction *item);

GList *da_transaction_new(void);
void da_transaction_destroy(void);

void da_transaction_queue_sort(GQueue *queue);
GList *da_transaction_sort(GList *list);
gboolean da_transaction_prepend(Transaction *item);
gboolean da_transaction_insert_sorted(Transaction *item);

void da_transaction_set_flag(Transaction *item);
void da_transaction_consistency(Transaction *item);


typedef enum
{
	TXN_DLG_ACTION_NONE,
	TXN_DLG_ACTION_ADD,
	TXN_DLG_ACTION_INHERIT,
	TXN_DLG_ACTION_EDIT,
	TXN_DLG_ACTION_VIEW
} HbTxnDlgAction;


typedef enum
{
	TXN_DLG_TYPE_NONE,
	TXN_DLG_TYPE_TXN,
	TXN_DLG_TYPE_TPL,
	TXN_DLG_TYPE_SCH
} HbTxnDlgType;


guint da_transaction_length(void);

void transaction_remove(Transaction *ope);
void transaction_changed(Transaction *txn, gboolean saverecondate);
gboolean da_transaction_insert_memo(gchar *memo, guint32 date);
gboolean da_transaction_insert_memos(Transaction *txn);
Transaction *transaction_add(GtkWindow *parent, gboolean addmode, Transaction *ope);

gchar *transaction_get_status_string(Transaction *txn);
gboolean transaction_is_balanceable(Transaction *ope);
gint transaction_get_type(Transaction *txn);
gboolean transaction_acc_move(Transaction *txn, guint32 okacc, guint32 nkacc);

Transaction *transaction_xfer_child_new_from_txn(Transaction *txn);
Transaction *transaction_xfer_child_strong_get(Transaction *src);
gint transaction_xfer_search_or_add_child(GtkWindow *parent, gboolean addmode, Transaction *ope, guint32 kdstacc);
void transaction_xfer_change_to_normal(Transaction *ope);
void transaction_xfer_change_to_child(Transaction *ope, Transaction *child);
void transaction_xfer_child_sync(Transaction *s_txn, Transaction *child);
void transaction_xfer_remove_child(Transaction *src);
Transaction *transaction_old_get_child_transfer(Transaction *src);

guint transaction_auto_all_from_payee(GList *txnlist);

void transaction_common_values(Transaction *ref, Transaction *txn, gboolean init);

gint transaction_similar_mark(Account *acc, guint32 daygap);
void transaction_similar_unmark(Account *acc);

gint transaction_check_chkcatsign_mark(Account *acc);
void transaction_check_chkcatsign_unmark(Account *acc);

#endif
