import type { ComponentType } from 'react'
import type { CustomIconProps } from './_base'

import { MehrfamilienhausIcon } from './custom-mehrfamilienhaus'
import { ZweifamilienhausIcon } from './custom-zweifamilienhaus'
import { LagergebaeudeIcon } from './custom-lagergebaeude'
import { GrundstueckIcon } from './custom-grundstueck'
import { SonstigeIcon } from './custom-sonstige'
import { SatteldachIcon } from './custom-satteldach'
import { PultdachIcon } from './custom-pultdach'
import { WalmdachIcon } from './custom-walmdach'
import { EigentuemergemeinschaftIcon } from './custom-eigentuemergemeinschaft'
import { DachziegelIcon } from './custom-dachziegel'
import { KalenderUnter1MonatIcon } from './custom-kalender-unter-1-monat'
import { Kalender1Bis3MonateIcon } from './custom-kalender-1-3-monate'
import { Kalender4Bis6MonateIcon } from './custom-kalender-4-6-monate'
import { KalenderSofortIcon } from './custom-kalender-sofort'
import { Kalender7Bis12MonateIcon } from './custom-kalender-7-12-monate'
import { KalenderUeber12MonateIcon } from './custom-kalender-ueber-12-monate'

export type { CustomIconProps } from './_base'

export {
  MehrfamilienhausIcon,
  ZweifamilienhausIcon,
  LagergebaeudeIcon,
  GrundstueckIcon,
  SonstigeIcon,
  SatteldachIcon,
  PultdachIcon,
  WalmdachIcon,
  EigentuemergemeinschaftIcon,
  DachziegelIcon,
  KalenderUnter1MonatIcon,
  Kalender1Bis3MonateIcon,
  Kalender4Bis6MonateIcon,
  KalenderSofortIcon,
  Kalender7Bis12MonateIcon,
  KalenderUeber12MonateIcon,
}

export interface CustomIconEntry {
  component: ComponentType<CustomIconProps>
  label: string
}

// ── Neues Icon: import + export oben, dann hier 1 Zeile ─────────────────────
export const CUSTOM_ICON_REGISTRY: Record<string, CustomIconEntry> = {
  custom_mehrfamilienhaus:        { component: MehrfamilienhausIcon,        label: 'Mehrfamilienhaus' },
  custom_zweifamilienhaus:        { component: ZweifamilienhausIcon,        label: 'Zweifamilienhaus' },
  custom_lagergebaeude:           { component: LagergebaeudeIcon,           label: 'Lagergebäude' },
  custom_grundstueck:             { component: GrundstueckIcon,             label: 'Grundstück' },
  custom_sonstige:                { component: SonstigeIcon,                label: 'Sonstige' },
  custom_satteldach:              { component: SatteldachIcon,              label: 'Satteldach' },
  custom_pultdach:                { component: PultdachIcon,                label: 'Pultdach' },
  custom_walmdach:                { component: WalmdachIcon,                label: 'Walmdach' },
  custom_eigentuemergemeinschaft: { component: EigentuemergemeinschaftIcon, label: 'Eigentümergemeinschaft' },
  custom_dachziegel:              { component: DachziegelIcon,              label: 'Dachziegel' },
  custom_kalender_unter_1_monat:  { component: KalenderUnter1MonatIcon,     label: 'Kalender: < 1 Monat' },
  custom_kalender_1_3_monate:     { component: Kalender1Bis3MonateIcon,     label: 'Kalender: 1–3 Monate' },
  custom_kalender_4_6_monate:      { component: Kalender4Bis6MonateIcon,    label: 'Kalender: 4–6 Monate' },
  custom_kalender_sofort:          { component: KalenderSofortIcon,         label: 'Kalender: Sofort' },
  custom_kalender_7_12_monate:     { component: Kalender7Bis12MonateIcon,   label: 'Kalender: 7–12 Monate' },
  custom_kalender_ueber_12_monate: { component: KalenderUeber12MonateIcon,  label: 'Kalender: > 12 Monate' },
}

// Derived maps — do not edit manually
export const CUSTOM_ICONS: Record<string, ComponentType<CustomIconProps>> =
  Object.fromEntries(Object.entries(CUSTOM_ICON_REGISTRY).map(([k, v]) => [k, v.component]))

export const CUSTOM_ICON_LABELS: Record<string, string> =
  Object.fromEntries(Object.entries(CUSTOM_ICON_REGISTRY).map(([k, v]) => [k, v.label]))
