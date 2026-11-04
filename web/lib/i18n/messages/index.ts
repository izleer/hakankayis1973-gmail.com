import type { Locale } from '../config';
import enCommon from './en/common';
import deCommon from './de/common';
import frCommon from './fr/common';
import esCommon from './es/common';

import enHome from './en/home';
import deHome from './de/home';
import frHome from './fr/home';
import esHome from './es/home';

import enAssets from './en/assets';
import deAssets from './de/assets';
import frAssets from './fr/assets';
import esAssets from './es/assets';

import enAssetDetail from './en/assetDetail';
import deAssetDetail from './de/assetDetail';
import frAssetDetail from './fr/assetDetail';
import esAssetDetail from './es/assetDetail';

import enGroups from './en/groups';
import deGroups from './de/groups';
import frGroups from './fr/groups';
import esGroups from './es/groups';

import enGroupDetail from './en/groupDetail';
import deGroupDetail from './de/groupDetail';
import frGroupDetail from './fr/groupDetail';
import esGroupDetail from './es/groupDetail';

import enExplore from './en/explore';
import deExplore from './de/explore';
import frExplore from './fr/explore';
import esExplore from './es/explore';

import enProfile from './en/profile';
import deProfile from './de/profile';
import frProfile from './fr/profile';
import esProfile from './es/profile';

import enArchive from './en/archive';
import deArchive from './de/archive';
import frArchive from './fr/archive';
import esArchive from './es/archive';

import enNotifications from './en/notifications';
import deNotifications from './de/notifications';
import frNotifications from './fr/notifications';
import esNotifications from './es/notifications';

import enSocial from './en/social';
import deSocial from './de/social';
import frSocial from './fr/social';
import esSocial from './es/social';

export type PluralForms = {
  one?: string;
  few?: string;
  many?: string;
  other?: string;
  zero?: string;
};

export type CatalogEntry = string | PluralForms;
export type Catalog = Record<string, CatalogEntry>;

/**
 * Alan bazlı parçalar burada birleşir. Yeni bir dil eklemek için
 * config.ts içindeki `locales` listesine kodu ekleyip aynı ada sahip
 * bir klasördeki parçaları oluşturmak yeterlidir.
 */
export const catalogs: Record<Locale, Catalog> = {
  tr: {},
  en: {
    ...enCommon,
    ...enHome,
    ...enAssets,
    ...enAssetDetail,
    ...enGroups,
    ...enGroupDetail,
    ...enExplore,
    ...enProfile,
    ...enArchive,
    ...enNotifications,
    ...enSocial,
  },
  de: {
    ...deCommon,
    ...deHome,
    ...deAssets,
    ...deAssetDetail,
    ...deGroups,
    ...deGroupDetail,
    ...deExplore,
    ...deProfile,
    ...deArchive,
    ...deNotifications,
    ...deSocial,
  },
  fr: {
    ...frCommon,
    ...frHome,
    ...frAssets,
    ...frAssetDetail,
    ...frGroups,
    ...frGroupDetail,
    ...frExplore,
    ...frProfile,
    ...frArchive,
    ...frNotifications,
    ...frSocial,
  },
  es: {
    ...esCommon,
    ...esHome,
    ...esAssets,
    ...esAssetDetail,
    ...esGroups,
    ...esGroupDetail,
    ...esExplore,
    ...esProfile,
    ...esArchive,
    ...esNotifications,
    ...esSocial,
  },
};

export const catalogsByLocale = catalogs;
