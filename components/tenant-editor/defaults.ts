import type { ContactFieldConfig, EditorState, EditorQuestion } from "@/types";

export const DEFAULT_CONTACT_FIELDS: ContactFieldConfig[] = [
  // Aufgabe 40 Polish: alle Default-Felder als "touched" markiert — Keys sind
  // bewusst kanonisch ("name", "email", "telefon", "plz", "anrede") und sollen
  // nicht durch Label-Edit überschrieben werden.
  {
    _clientId: "default_anrede",
    key: "anrede",
    type: "radio",
    label: "Anrede",
    options: ["Herr", "Frau"],
    required: false,
    visible: false,
    sort_order: 0,
    _keyTouched: true,
  },
  {
    _clientId: "default_name",
    key: "name",
    type: "text",
    label: "Vor- und Nachname",
    placeholder: "Max Mustermann",
    required: true,
    visible: true,
    sort_order: 1,
    _keyTouched: true,
  },
  {
    _clientId: "default_email",
    key: "email",
    type: "email",
    label: "E-Mail-Adresse",
    placeholder: "max@beispiel.de",
    required: true,
    visible: true,
    sort_order: 2,
    _keyTouched: true,
  },
  {
    _clientId: "default_telefon",
    key: "telefon",
    type: "tel",
    label: "Telefonnummer",
    placeholder: "+49 123 456789",
    required: false,
    visible: true,
    sort_order: 3,
    _keyTouched: true,
  },
  {
    _clientId: "default_plz",
    key: "plz",
    type: "plz",
    label: "Postleitzahl",
    placeholder: "12345",
    required: false,
    visible: false,
    sort_order: 4,
    _keyTouched: true,
  },
];

// Aufgabe 38: Factory für neue Custom-Multi-Field-Pages.
// Aufgabe 39: Welcome-Screen-Factory. Optionaler Intro-Step am Anfang des Funnels.
export function makeDefaultWelcomePage(): EditorQuestion {
  const rand = Math.random().toString(36).slice(2, 8);
  return {
    _id: `q_welcome_${Date.now().toString(36)}_${rand}`,
    dbId: undefined,
    kind: "welcome",
    questionKey: `welcome_${rand}`,
    questionType: "single_choice", // unused
    title: "Willkommen!",
    subtitle: "In den nächsten 2 Minuten beantwortest du ein paar Fragen — dann melden wir uns mit einem Angebot.",
    visible: true,
    required: false,
    placeholder: "",
    maxLength: "",
    sliderMin: "0",
    sliderMax: "100",
    sliderStep: "1",
    sliderUnit: "",
    sliderDefault: "50",
    options: [],
    dateMin: "",
    dateMax: "",
    dateDefault: "",
    numberMin: "",
    numberMax: "",
    numberStep: "1",
    numberDefault: "",
    numberUnit: "",
    checkboxLabel: "",
    welcomeButtonLabel: "Los geht's →",
    // Aufgabe 40 Polish: Welcome-Pages haben generierten questionKey für page-config — kein title-Sync
    _keyTouched: true,
  };
}

// Aufgabe 39: Adresse-Vorlage als Custom-Karte mit 4 vorausgewählten Feldern.
export function makeAddressCustomPage(): EditorQuestion {
  const rand = Math.random().toString(36).slice(2, 8);
  return {
    _id: `q_address_${Date.now().toString(36)}_${rand}`,
    dbId: undefined,
    kind: "custom",
    questionKey: `adresse_${rand}`,
    questionType: "single_choice",
    title: "Wie lautet deine Adresse?",
    subtitle: "Für ein passgenaues Angebot brauchen wir deine Anschrift.",
    visible: true,
    required: false,
    placeholder: "",
    maxLength: "",
    sliderMin: "0",
    sliderMax: "100",
    sliderStep: "1",
    sliderUnit: "",
    sliderDefault: "50",
    options: [],
    dateMin: "",
    dateMax: "",
    dateDefault: "",
    numberMin: "",
    numberMax: "",
    numberStep: "1",
    numberDefault: "",
    numberUnit: "",
    checkboxLabel: "",
    customFields: [
      // Aufgabe 40 Polish: kanonische Adress-Keys → _keyTouched=true (kein Auto-Sync mit Label)
      { _clientId: `cf_addr_${rand}_strasse`, key: "strasse",  type: "text", label: "Straße",         placeholder: "Beispielstraße",  required: true, visible: true, sort_order: 0, _keyTouched: true },
      { _clientId: `cf_addr_${rand}_hausnr`,  key: "hausnr",   type: "text", label: "Hausnummer",     placeholder: "12a",             required: true, visible: true, sort_order: 1, _keyTouched: true },
      { _clientId: `cf_addr_${rand}_plz`,     key: "plz",      type: "plz",  label: "Postleitzahl",   placeholder: "12345",           required: true, visible: true, sort_order: 2, _keyTouched: true },
      { _clientId: `cf_addr_${rand}_ort`,     key: "ort",      type: "text", label: "Ort",            placeholder: "Berlin",          required: true, visible: true, sort_order: 3, _keyTouched: true },
    ],
    _keyTouched: true,
  };
}

// Aufgabe 50: Kontaktdaten-Vorlage — die häufigste Lead-Card (Name + E-Mail + Telefon).
export function makeContactCard(): EditorQuestion {
  const rand = Math.random().toString(36).slice(2, 8);
  return {
    ...makeDefaultCustomPage(),
    _id: `q_contact_${Date.now().toString(36)}_${rand}`,
    questionKey: `kontaktdaten_${rand}`,
    title: "Deine Kontaktdaten",
    subtitle: "Wie können wir dich erreichen?",
    customFields: [
      { _clientId: `cf_c_${rand}_name`,  key: "name",    type: "full_name", label: "Name",    placeholder: "", required: true,  visible: true, sort_order: 0, _keyTouched: true },
      { _clientId: `cf_c_${rand}_email`, key: "email",   type: "email",     label: "E-Mail",  placeholder: "", required: true,  visible: true, sort_order: 1, _keyTouched: true },
      { _clientId: `cf_c_${rand}_tel`,   key: "telefon", type: "tel",       label: "Telefon", placeholder: "", required: false, visible: true, sort_order: 2, _keyTouched: true },
    ],
  };
}

// Default-Layout: 2 Felder (Name + Email) als sinnvolle Startbasis. Tenant erweitert via Properties-Panel.
export function makeDefaultCustomPage(): EditorQuestion {
  const rand = Math.random().toString(36).slice(2, 8);
  return {
    _id: `q_custom_${Date.now().toString(36)}_${rand}`,
    dbId: undefined,
    kind: "custom",
    questionKey: `karte_${rand}`,
    questionType: "single_choice", // unused for custom — fallback to satisfy type
    title: "Neue Karte",
    subtitle: "",
    visible: true,
    required: false,
    placeholder: "",
    maxLength: "",
    sliderMin: "0",
    sliderMax: "100",
    sliderStep: "1",
    sliderUnit: "",
    sliderDefault: "50",
    options: [],
    dateMin: "",
    dateMax: "",
    dateDefault: "",
    numberMin: "",
    numberMax: "",
    numberStep: "1",
    numberDefault: "",
    numberUnit: "",
    checkboxLabel: "",
    // Aufgabe 39 Polish: Custom-Karte startet leer. Stavros — Name/Email-Defaults waren oft
    // fehl am Platz. User fügt eigene Felder via Properties-Panel hinzu.
    customFields: [],
    _keyTouched: true,
  };
}

export const DEFAULT_QUESTION: EditorQuestion = {
  _id: "default_q1",
  dbId: undefined,
  kind: "question",
  questionKey: "interesse",
  questionType: "single_choice",
  title: "Was interessiert Sie?",
  subtitle: "Bitte wähle eine Option.",
  visible: true,
  required: true,
  placeholder: "",
  maxLength: "",
  sliderMin: "0",
  sliderMax: "100",
  sliderStep: "1",
  sliderUnit: "",
  sliderDefault: "50",
  options: [
    { _id: "default_opt1", label: "Option A", value: "option_a" },
    { _id: "default_opt2", label: "Option B", value: "option_b" },
    { _id: "default_opt3", label: "Option C", value: "option_c" },
  ],
  dateMin: "",
  dateMax: "",
  dateDefault: "",
  numberMin: "",
  numberMax: "",
  numberStep: "1",
  numberDefault: "",
  numberUnit: "",
  checkboxLabel: "Ja, ich stimme zu",
  // Aufgabe 40 Polish: questionKey ist bewusst "interesse" — kein Auto-Sync
  _keyTouched: true,
};

export const DEFAULT_EDITOR_STATE: EditorState = {
  funnelName: "",
  funnelTitle: "Jetzt kostenloses Angebot anfordern",
  primaryColor: "#22c55e",
  textColor: "#1f2937",
  backgroundColor: "#ffffff",
  pageBackgroundColor: "transparent",
  font: "system",
  borderRadius: "0.5rem",
  maxWidth: "720px",
  contactFormSubtitle: "Wer soll das Angebot erhalten?",
  submitButtonLabel: "Anfrage absenden",
  successMessage: "Vielen Dank für Ihre Anfrage!",
  responseMessage: "Wir melden uns in Kürze bei Ihnen.",
  privacyText:
    "Mit dem Absenden stimme ich zu, per E-Mail und Telefon zu meiner Anfrage kontaktiert zu werden.",
  privacyPolicyUrl: "",
  answersOverviewLabel: "Ihre Angaben im Überblick:",
  showAnswersOverview: false,
  notificationEmail: "",
  emailSenderLocal: "",
  isActive: true,
  // Aufgabe 51: Kontaktformular abgeschafft — neue Funnels laufen im skip-mode (Submit am
  // Funnel-Ende, Lead-Erfassung via Kontaktdaten-Card). Keine Submit-Page-Felder mehr.
  skipSubmitStep: true,
  redirectUrl: "",
  questions: [DEFAULT_QUESTION],
  contactFields: [],
};
