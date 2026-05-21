// ---------------------------------------------------------------------------
// Campus checkpoint coordinates (IIITDM Kurnool).
//
// Each location name here MUST match exactly what you enter in the
// "Location" field when registering an ESP32 scanner under Devices.
// The live map auto-resolves: scanner registered at "Main Gate" -> Main Gate
// pin lights up green (online) or red (offline). Unmapped scanners just appear
// in the list below the map; unscanned pins appear grey.
//
// Add more locations by appending to this array.
// ---------------------------------------------------------------------------

export interface CampusLocation {
  name: string;       // must match scanner.location exactly (case-sensitive)
  lat: number;
  lng: number;
  description?: string;
}

export const CAMPUS_LOCATIONS: CampusLocation[] = [
  { name: "Main Gate",   lat: 15.762034, lng: 78.039661, description: "Primary entrance" },
  { name: "ECE Block",   lat: 15.761411, lng: 78.038049, description: "ECE department" },
  { name: "Sports",      lat: 15.758837, lng: 78.036004, description: "Sports ground" },
  { name: "MVHR Hostel", lat: 15.758306, lng: 78.040361, description: "Hostel block" },
];

/** Center of campus (used for the initial map view). */
export const CAMPUS_CENTER = { lat: 15.760400, lng: 78.038500, zoom: 16 };
