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

#ifndef __HB_MISC__H__
#define __HB_MISC__H__


//amount sign
enum {
	HB_AMT_SIGN_OFF,
	HB_AMT_SIGN_EXP,
	HB_AMT_SIGN_INC
};

//date min/max bound
typedef enum {
	HB_DATE_BOUND_FIRST,
	HB_DATE_BOUND_LAST,
} HbDateBound;


double hb_amount_round(const double x, unsigned int n);
gdouble hb_amount_base(gdouble value, guint32 kcur);
gdouble hb_amount_convert(gdouble value, guint32 skcur, guint32 dkcur);
gdouble hb_amount_to_euro(gdouble amount);
gboolean hb_amount_type_match(gdouble amount, gint type);
gint hb_amount_cmp(gdouble val1, gdouble val2);
gboolean hb_amount_between(gdouble val, gdouble min, gdouble max);
gint hb_amount_forced_sign(const gchar *text);


gdouble hb_rate(gdouble value, gdouble total);
gchar *hb_str_rate(gchar *outstr, gint outlen, gdouble rate);

gchar *hb_str_formatd(gchar *outstr, gint outlen, gchar *buf1, Currency *cur, gboolean showsymbol);

void hb_strfmon(gchar *outstr, gint outlen, gdouble value, guint32 kcur, gboolean minor);
void hb_strfmon_int(gchar *outstr, gint outlen, gdouble value, guint32 kcur, gboolean minor);
void hb_strfnum(gchar *outstr, gint outlen, gdouble value, guint32 kcur, gboolean minor);
void hb_strfmongc(gchar *outstr, gint outlen, gdouble value);

void _format_decimal(GString *node, ToStringMode mode, gdouble value);

void hb_strlifeenergy(gchar *outstr, gint outlen, gdouble value, guint32 kcur, gboolean minor);


gint hb_filename_type_get_by_extension(gchar *filepath);
gchar *hb_filename_new_without_extension(gchar *filename);

gchar *hb_filename_new_for_backup(gchar *filename);
GPtrArray *hb_filename_backup_list(gchar *filename);

gchar *hb_filename_backup_get_filtername(gchar *filename);

gchar *hb_filename_new_with_extension(gchar *filename, const gchar *extension);

gchar *get_normal_color_amount(gdouble value);
gchar *get_minimum_color_amount(gdouble value, gdouble minvalue);

void hb_label_set_amount(GtkLabel *label, gdouble value, guint32 kcur, gboolean minor);
void hb_label_set_colvalue(GtkLabel *label, gdouble value, guint32 kcur, gboolean minor);

//void get_period_minmax(guint month, guint year, guint32 *mindate, guint32 *maxdate);
//void get_range_minmax(guint32 refdate, gint range, guint32 *mindate, guint32 *maxdate);

gint hb_string_ascii_compare(gchar *s1, gchar *s2);
gint hb_string_compare(gchar *s1, gchar *s2);
gint hb_string_utf8_strstr(gchar *haystack, gchar *needle, gboolean exact);
gint hb_string_utf8_compare(gchar *s1, gchar *s2);

gchar *hb_string_dup_raw_amount_clean(const gchar *string, gint digits);

void hb_string_strip_utf8_bom(gchar *str);
void hb_string_strip_crlf(gchar *str);
gboolean hb_string_has_leading_trailing(gchar *str);

void hb_string_replace_char(gchar oc, gchar nc, gchar *str);
void hb_string_remove_char(gchar c, gchar *str);
gchar *hb_string_copy_jsonpair(gchar *dst, gchar *str);
void hb_string_inline(gchar *str);
gchar *hb_strdup_nobrackets (const gchar *str);

gchar *hb_sprint_date(gchar *outstr, guint32 julian);

guint32 hb_date_get_jbound(guint32 jdate, HbDateBound bound);
guint32 hb_date_get_julian(gchar *string, gint datefmt);

gboolean hb_string_isdate(gchar *str);
gboolean hb_string_isdigit(gchar *str);
gboolean hb_string_isprint(gchar *str);


void hb_print_date(guint32 jdate, gchar *label);

void hex_dump(gchar *ptr, guint length);

#if( (GLIB_MAJOR_VERSION == 2) && (GLIB_MINOR_VERSION < 68) )
guint g_string_replace (GString     *string,
                  const gchar *find,
                  const gchar *replace,
                  guint        limit);
#endif

#endif
