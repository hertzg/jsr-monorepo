import type { Node } from "xml-parser";
import { atoi, parseGCharP } from "./_parse.ts";
import {
  hb_xml_attr_int,
  hb_xml_attr_int0,
  hb_xml_attr_txt,
  hb_xml_tag,
} from "./_serialize.ts";
import type { gCharP, gUInt32, gUShort } from "./_g_types.ts";

/** Global file-level properties from the `<properties>` element. */
export interface Properties {
  /** Owner name / file title. */
  owner: gCharP;
  /** Key of the base (default) currency. */
  baseCurrency: gUInt32;
  /** Key of the vehicle expense category. */
  vehicleCategory: gUInt32;
  /** Vehicle scheduled transaction mode ({@linkcode VEHICLE_SCHEDULED_TRANSACTION_MODE_WEEKDAY} or {@linkcode VEHICLE_SCHEDULED_TRANSACTION_MODE_NUMBER_OF_DAYS}). */
  vehicleScheduledTransactionMode: gUShort;
  /** Day of week for vehicle scheduled transactions. */
  vehicleScheduledTransactionWeekDay: gUShort;
  /** Number of days gap for vehicle scheduled transactions. */
  vehicleScheduledTransactionNumberOfDays: gUShort;
}

/** Vehicle scheduled transaction mode: repeat on a specific weekday. */
export const VEHICLE_SCHEDULED_TRANSACTION_MODE_WEEKDAY = 0;
/** Vehicle scheduled transaction mode: repeat every N days. */
export const VEHICLE_SCHEDULED_TRANSACTION_MODE_NUMBER_OF_DAYS = 1;

/**
 * Parses the `<properties>` XML node into a {@linkcode Properties} object.
 *
 * @param node - The `<properties>` XML node.
 * @returns The parsed properties.
 */
export function parseProperties({ attributes }: Node): Properties {
  return {
    owner: parseGCharP(attributes.title),
    baseCurrency: atoi(attributes.curr),
    vehicleCategory: atoi(attributes.car_category),
    vehicleScheduledTransactionMode: atoi(attributes.auto_smode),
    vehicleScheduledTransactionWeekDay: atoi(attributes.auto_weekday),
    vehicleScheduledTransactionNumberOfDays: atoi(attributes.auto_nbdays),
  };
}

/**
 * Serializes a {@linkcode Properties} object into a `<properties ... />` XML tag.
 *
 * @param properties - The properties to serialize.
 * @returns The self-closing XML tag string.
 */
export const serializeProperties = (properties: Properties): string =>
  hb_xml_tag(
    "<properties",
    hb_xml_attr_txt("title", properties.owner),
    hb_xml_attr_int("curr", properties.baseCurrency),
    hb_xml_attr_int("car_category", properties.vehicleCategory),
    hb_xml_attr_int0("auto_smode", properties.vehicleScheduledTransactionMode),
    hb_xml_attr_int(
      "auto_weekday",
      properties.vehicleScheduledTransactionWeekDay,
    ),
    hb_xml_attr_int(
      "auto_nbdays",
      properties.vehicleScheduledTransactionNumberOfDays,
    ),
  );
