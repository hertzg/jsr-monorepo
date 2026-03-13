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


/* -------- named icons (Standard Icon Name) -------- */


//obsolete, as since since gtk3.10 : no more icons for dialogs and menu
/*
#define ICONNAME_SAVE_AS			"document-save-as"	  //obsolete
#define ICONNAME_REVERT		    "document-revert"	  //obsolete
#define ICONNAME_PROPERTIES			"document-properties"   //obsolete
#define ICONNAME_CLOSE				"window-close"	  //obsolete
#define ICONNAME_QUIT				"application-exit"	  //obsolete
#define ICONNAME_HELP				"help-browser"	  //obsolete
#define ICONNAME_ABOUT				"help-about"	  //obsolete
#define ICONNAME_PREFERENCES		"preferences-system"	  //obsolete
*/

//#define ICONNAME_FIND				"edit-find"				//unused
//#define ICONNAME_CLEAR			"edit-clear"			//unused
//#define ICONNAME_HB_SCHED_SKIP		"media-skip-forward"
//#define ICONNAME_HB_SCHED_POST		"media-playback-start"

//in 5.2 no themeable icon to keep a consistent iconset

#define ICONNAME_WARNING			"dialog-warning"
#define ICONNAME_ERROR				"dialog-error"
#define ICONNAME_INFO				"dialog-information"


#define ICONNAME_FOLDER				"folder-symbolic"
#define ICONNAME_EMBLEM_OK			"emblem-ok-symbolic"
#define ICONNAME_EMBLEM_SYSTEM		"emblem-system-symbolic"
#define ICONNAME_WINDOW_CLOSE		"window-close-symbolic"
#define ICONNAME_LIST_ADD			"list-add-symbolic"
#define ICONNAME_LIST_EDIT			"document-edit-symbolic"
#define ICONNAME_LIST_DUPLICATE		"list-duplicate-symbolic"
#define ICONNAME_LIST_DELETE		"list-remove-symbolic"
#define ICONNAME_LIST_DELETE_ALL	"list-remove-all-symbolic"
#define ICONNAME_LIST_MOVE_UP		"hb-go-up-symbolic"
#define ICONNAME_LIST_MOVE_DOWN		"hb-go-down-symbolic"
#define ICONNAME_LIST_MOVE_AFTER	"list-move-after-symbolic"
#define ICONNAME_SYSTEM_SEARCH		"system-search-symbolic"


// custom or gnome not found
#define ICONNAME_HB_BUTTON_MENU		"open-menu-symbolic"
#define ICONNAME_HB_BUTTON_BROWSER	"open-in-browser-symbolic"
#define ICONNAME_HB_BUTTON_COLLAPSE	"list-collapse-all-symbolic"
#define ICONNAME_HB_BUTTON_EXPAND	"list-expand-all-symbolic"
#define ICONNAME_HB_BUTTON_SPLIT	"edit-split-symbolic"
#define ICONNAME_HB_BUTTON_DELETE	"edit-delete-symbolic"
#define ICONNAME_HB_TOGGLE_SIGN		"toggle-sign-symbolic"
#define ICONNAME_HB_LIST_MERGE		"list-merge-symbolic"
#define ICONNAME_HB_BUTTON_HIDE		"eye-not-looking-symbolic"
#define ICONNAME_HB_BUTTON_USAGE	"data-usage-symbolic"

#define ICONNAME_HB_TEXT_CASE		"text-casesensitive-symbolic"
#define ICONNAME_HB_TEXT_REGEX		"text-regularexpression-symbolic"


/* -------- named icons (Custom to homebank) -------- */


#define ICONNAME_HB_CURRENCY		"hb-currency"
#define ICONNAME_HB_ACCOUNT         "hb-account"
#define ICONNAME_HB_ARCHIVE         "hb-archive"
#define ICONNAME_HB_ASSIGN          "hb-assign"
#define ICONNAME_HB_BUDGET          "hb-budget"
#define ICONNAME_HB_CATEGORY        "hb-category"
#define ICONNAME_HB_PAYEE           "hb-payee"
#define ICONNAME_HB_OPE_SHOW        "hb-ope-show"   //? "view-register
#define ICONNAME_HB_OPE_FUTURE      "hb-ope-future"
#define ICONNAME_HB_REP_STATS       "hb-rep-stats"
#define ICONNAME_HB_REP_TIME        "hb-rep-time"
#define ICONNAME_HB_REP_BALANCE     "hb-rep-balance"
#define ICONNAME_HB_REP_BUDGET      "hb-rep-budget"
#define ICONNAME_HB_REP_CAR         "hb-rep-vehicle"
#define ICONNAME_HB_HELP            "hb-help"
#define ICONNAME_HB_DONATE          "hb-donate"

#define ICONNAME_HB_VIEW_LIST	    "hb-view-list"   	//"view-list-text"
#define ICONNAME_HB_VIEW_BAR	    "hb-view-bar"    	//"view-chart-bar"
#define ICONNAME_HB_VIEW_COLUMN	    "hb-view-column" 	//"view-chart-column"
#define ICONNAME_HB_VIEW_LINE	    "hb-view-line"   	//"view-chart-line"
#define ICONNAME_HB_VIEW_PROGRESS	"hb-view-progress"  //"view-chart-progress"
#define ICONNAME_HB_VIEW_PIE	    "hb-view-pie"    	//"view-chart-pie"
#define ICONNAME_HB_VIEW_DONUT	    "hb-view-donut"  	//"view-chart-donut"
#define ICONNAME_HB_VIEW_STACK	    "hb-view-stack"  	//"view-chart-stack"
#define ICONNAME_HB_VIEW_STACK100   "hb-view-stack100"  //"view-chart-stack100"
#define ICONNAME_HB_SHOW_LEGEND	    "hb-legend"			//"view-legend"
#define ICONNAME_HB_SHOW_RATE	    "hb-rate"	    	// obsolete ?
#define ICONNAME_HB_REFRESH		    "hb-view-refresh"	//"view-refresh"	
#define ICONNAME_HB_FILTER		    "hb-filter"			//"edit-filter"
#define ICONNAME_HB_CLEAR			"hb-clear"			//"edit-clear"
#define ICONNAME_HB_LIFEENERGY		"hb-life-energy"

#define ICONNAME_CHANGES_PREVENT	"hb-changes-prevent"
#define ICONNAME_CHANGES_ALLOW  	"hb-changes-allow"
#define ICONNAME_HB_QUICKTIPS     	"hb-quicktips"      //quick help tips


#define ICONNAME_HB_FILE_NEW		"hb-document-new"	//document-new
#define ICONNAME_HB_FILE_OPEN		"hb-document-open"	//document-open
#define ICONNAME_HB_FILE_SAVE		"hb-document-save"	//document-save
#define ICONNAME_HB_FILE_IMPORT		"hb-file-import"	//document-import
#define ICONNAME_HB_FILE_EXPORT		"hb-file-export"	//document-export
#define ICONNAME_HB_FILE_VALID		"hb-file-valid"
#define ICONNAME_HB_FILE_INVALID	"hb-file-invalid"

#define ICONNAME_HB_PRINT			"hb-document-print"

#define ICONNAME_HB_OPE_MOVUP		"hb-go-up"
#define ICONNAME_HB_OPE_MOVDW		"hb-go-down"
#define ICONNAME_HB_OPE_ADD         "hb-ope-add"	//? "edit-add"
#define ICONNAME_HB_OPE_HERIT       "hb-ope-herit"  //? "edit-clone"
#define ICONNAME_HB_OPE_EDIT        "hb-ope-edit"   //
#define ICONNAME_HB_OPE_MULTIEDIT   "hb-ope-multiedit"   //
#define ICONNAME_HB_OPE_CLEARED     "hb-ope-cleared"
#define ICONNAME_HB_OPE_RECONCILED  "hb-ope-reconciled"
#define ICONNAME_HB_OPE_DELETE      "hb-ope-delete" //? "edit-delete"
//#define ICONNAME_CONVERT			"hb-ope-convert"	// obsolete ?
//#define ICONNAME_HB_ASSIGN_RUN      "hb-assign-run"     // obsolete ?


/* -- status ope icons */ 
#define ICONNAME_HB_ITEM_CLEAR      "hb-item-clear"
#define ICONNAME_HB_ITEM_RECON      "hb-item-recon"
#define ICONNAME_HB_ITEM_RECONLOCK  "hb-item-reconlock"
#define ICONNAME_HB_ITEM_VOID       "hb-item-void"


/* -- listview icons -- */
//#define ICONNAME_HB_ITEM_NONE       "hb-item-none"
#define ICONNAME_HB_ITEM_CLOSED     "hb-item-closed"
#define ICONNAME_HB_ITEM_ADDED      "hb-item-added"     //"hb-ope-new"
#define ICONNAME_HB_ITEM_EDITED     "hb-item-edited"
#define ICONNAME_HB_ITEM_AUTO       "hb-item-auto"      //"hb-ope-auto"   //? 
#define ICONNAME_HB_ITEM_BUDGET     "hb-item-budget"    //"hb-ope-budget" //?
#define ICONNAME_HB_ITEM_FORCED     "hb-item-forced"    //"hb-ope-forced" //?
#define ICONNAME_HB_ITEM_REMIND     "hb-item-remind"
#define ICONNAME_HB_ITEM_SIMILAR    "hb-item-similar"
#define ICONNAME_HB_ITEM_PREFILLED  "hb-item-prefilled"
#define ICONNAME_HB_ITEM_FUTURE     "hb-item-future"
//5.9
#define ICONNAME_HB_ITEM_IMPORT     "hb-item-import"
#define ICONNAME_HB_ITEM_PAST       "hb-item-pending"


#define ICONNAME_HB_PM_INTXFER		"hb-pm-intransfer"
