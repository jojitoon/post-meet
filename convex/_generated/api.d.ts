/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as automations from "../automations.js";
import type * as botService from "../botService.js";
import type * as calendars from "../calendars.js";
import type * as contentGeneration from "../contentGeneration.js";
import type * as contentGenerationMutations from "../contentGenerationMutations.js";
import type * as contentGenerationQueries from "../contentGenerationQueries.js";
import type * as crons from "../crons.js";
import type * as events from "../events.js";
import type * as eventsQueries from "../eventsQueries.js";
import type * as generatedPosts from "../generatedPosts.js";
import type * as http from "../http.js";
import type * as meetingBaas from "../meetingBaas.js";
import type * as myFunctions from "../myFunctions.js";
import type * as recall from "../recall.js";
import type * as socialMedia from "../socialMedia.js";
import type * as socialMediaPosting from "../socialMediaPosting.js";
import type * as userSettings from "../userSettings.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  automations: typeof automations;
  botService: typeof botService;
  calendars: typeof calendars;
  contentGeneration: typeof contentGeneration;
  contentGenerationMutations: typeof contentGenerationMutations;
  contentGenerationQueries: typeof contentGenerationQueries;
  crons: typeof crons;
  events: typeof events;
  eventsQueries: typeof eventsQueries;
  generatedPosts: typeof generatedPosts;
  http: typeof http;
  meetingBaas: typeof meetingBaas;
  myFunctions: typeof myFunctions;
  recall: typeof recall;
  socialMedia: typeof socialMedia;
  socialMediaPosting: typeof socialMediaPosting;
  userSettings: typeof userSettings;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
