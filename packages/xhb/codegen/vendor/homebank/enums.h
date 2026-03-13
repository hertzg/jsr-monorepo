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

#ifndef __HB_ENUMS_H__
#define __HB_ENUMS_H__


/*
** paymode pixbuf
*/
#define OLDPAYMODE_INTXFER 5


typedef enum {
	DEFAULT,
	PREFER_DARK,
	PREFER_LIGHT
} ColorScheme;


typedef enum {
	HB_STRING_NONE,
	HB_STRING_CLIPBOARD,
	HB_STRING_PRINT,
	HB_STRING_EXPORT
} ToStringMode;


enum
{
	PAYMODE_NONE,
	PAYMODE_CCARD,
	PAYMODE_CHECK,
	PAYMODE_CASH,
	PAYMODE_XFER,
	PAYMODE_OBSOLETEINTXFER,
	/* 4.1 new payments here */
	PAYMODE_DCARD = 6,
	PAYMODE_REPEATPMT,
	PAYMODE_EPAYMENT,
	PAYMODE_DEPOSIT,
	PAYMODE_FEE,
	/* 4.6 new paymode */
	PAYMODE_DIRECTDEBIT,
	/* 5.8 new paymode */
	PAYMODE_MOBPHONE,
//	PAYMODE_,
	NUM_PAYMODE_MAX
};
#define NUM_PAYMODE_KEY 12



/* list display transaction (dsp_account) */
enum
{
	//0 is invalid column
	LST_DSPOPE_STATUS = 1,	/*  1 fake column */
	LST_DSPOPE_DATE,		/*  2 fake column */
	LST_DSPOPE_PAYNUMBER,	/*  3 fake column <5.8 xxx_INFO */
	LST_DSPOPE_PAYEE,		/*  4 fake column */
	LST_DSPOPE_MEMO,		/*  5 fake column */
	LST_DSPOPE_AMOUNT,		/*  6 fake column */
	LST_DSPOPE_EXPENSE,		/*  7 fake column */
	LST_DSPOPE_INCOME,		/*  8 fake column */
	LST_DSPOPE_CATEGORY,	/*  9 fake column */
	LST_DSPOPE_TAGS,		/* 10 fake column */
	LST_DSPOPE_BALANCE, 	/* 11 fake column */
	LST_DSPOPE_CLR,     	/* 12 fake column */
	/* here we insert account column, only used for detail */
	LST_DSPOPE_ACCOUNT, 	/* 13 fake column : not stored */
	LST_DSPOPE_MATCH, 		/* 14 fake column : not stored */
	LST_DSPOPE_GRPFLAG,
	NUM_LST_DSPOPE
};


typedef enum {
	GRPFLAG_ANY = -1,
	GRPFLAG_NONE = 0,
	GRPFLAG_RED = 1,
	GRPFLAG_ORANGE,
	GRPFLAG_YELLOW,
	GRPFLAG_GREEN,
	GRPFLAG_BLUE,
	GRPFLAG_PURPLE,
	NUM_GRPFLAG
} HbGrpFlag;


//sort for various glist
enum {
	HB_GLIST_SORT_KEY,	//0
	HB_GLIST_SORT_NAME,	//1
	HB_GLIST_SORT_POS	//2
};


//
enum {
	HB_LIST_QUICK_SELECT_UNSET,
	HB_LIST_QUICK_SELECT_ALL,
	HB_LIST_QUICK_SELECT_NONE,
	HB_LIST_QUICK_SELECT_INVERT
};


//
enum {
	PRF_DATEFMT_MDY,
	PRF_DATEFMT_DMY,
	PRF_DATEFMT_YMD,
	NUM_PRF_DATEFMT
};


enum {
	PRF_OFXNAME_IGNORE,
	PRF_OFXNAME_MEMO,
	PRF_OFXNAME_PAYEE,
	PRF_OFXNAME_NUMBER
};


enum {
	PRF_OFXMEMO_IGNORE,
	PRF_OFXMEMO_NUMBER,
	PRF_OFXMEMO_MEMO,
	PRF_OFXMEMO_PAYEE
};

#define PRF_DTEX_CSVSEP_BUFFER	"\t,; "

enum {
	PRF_DTEX_CSVSEP_TAB,
	PRF_DTEX_CSVSEP_COMMA,
	PRF_DTEX_CSVSEP_SEMICOLON,
	PRF_DTEX_CSVSEP_SPACE,
};



/*
** list pixbuf (account/transaction)
*//*
enum
{
	LST_PIXBUF_ADD,
	LST_PIXBUF_EDIT,
	LST_PIXBUF_REMIND,
	LST_PIXBUF_VALID,
	LST_PIXBUF_AUTO,
	LST_PIXBUF_WARNING,
	NUM_LST_PIXBUF
};*/


/*
** toolbar item type
*//*
enum
{
	TOOLBAR_SEPARATOR,
	TOOLBAR_BUTTON,
	TOOLBAR_TOGGLE
};*/


#endif


