export interface Gemstone {
  id: string;
  variety: string;
  chemicalComposition: string;
  crystalSystem: string;
  colors: string[];
  causeOfColor: string;
  transparency: string[];
  luster: string;
  hardness: number;
  sgMin: number;
  sgMax: number;
  riMin: number;
  riMax: number;
  cleavage: string;
  fracture: string;
  opticCharacter: string;
  pleochroism: string;
  inclusions: string[];
  uvResponse: string;
  simulants: string[];
  treatments: string[];
  occurrences: string[];
  indianName: string;
  category: "Precious" | "Semi-precious" | "Organic";
  priceRangeINR: { min: number; max: number };
  priceRangeUSD: { min: number; max: number };
  formation: string;
  testingGuide: string[];
  marketDemand: "High" | "Medium" | "Low";
}

export const GEMSTONE_DATABASE: Gemstone[] = [
  {
    id: "ruby",
    variety: "Ruby",
    chemicalComposition: "Al₂O₃ (Aluminium Oxide)",
    crystalSystem: "Trigonal",
    colors: ["Red", "Pinkish-red", "Purple-red", "Dark red"],
    causeOfColor: "Chromium",
    transparency: ["Transparent", "Translucent", "Opaque"],
    luster: "Vitreous",
    hardness: 9,
    sgMin: 3.97,
    sgMax: 4.05,
    riMin: 1.762,
    riMax: 1.778,
    cleavage: "None (lamellar twinning, directional parting)",
    fracture: "Conchoidal, uneven",
    opticCharacter: "DR (Uniaxial negative)",
    pleochroism: "Strong dichroic (purplish-red to orangish-red)",
    inclusions: ["Silk (rutile needles)", "Crystals", "Feathers", "Fingerprints", "Zoning"],
    uvResponse: "Strong red fluorescence under LW-UV",
    simulants: ["Synthetic ruby", "Red spinel", "Garnet", "Glass", "Doublets", "CZ"],
    treatments: ["Heat treatment", "Lead glass filling", "Fracture filling", "Beryllium diffusion"],
    occurrences: ["Myanmar (Burma)", "Sri Lanka", "Mozambique", "Thailand", "Madagascar", "India"],
    indianName: "Manik / Manek",
    category: "Precious",
    priceRangeINR: { min: 5000, max: 500000 },
    priceRangeUSD: { min: 60, max: 6000 },
    formation: "Forms in metamorphic rocks, particularly marble and gneiss. Requires aluminum-rich, silica-poor environments with trace chromium.",
    testingGuide: [
      "Check RI: Should be 1.762-1.778 with birefringence of 0.008",
      "Check SG: Should be 3.97-4.05 (heavier than spinel)",
      "Look for silk inclusions under magnification",
      "Test fluorescence: Strong red under LW-UV (natural) vs weak/no fluorescence (synthetic)",
      "Check for curved striae in synthetics vs straight growth lines in natural"
    ],
    marketDemand: "High"
  },
  {
    id: "sapphire",
    variety: "Sapphire",
    chemicalComposition: "Al₂O₃ (Aluminium Oxide)",
    crystalSystem: "Trigonal",
    colors: ["Blue", "Pink", "Yellow", "Orange", "Green", "Purple", "Colorless"],
    causeOfColor: "Iron and Titanium (blue), Chromium (pink), Iron (yellow/green)",
    transparency: ["Transparent", "Translucent"],
    luster: "Vitreous",
    hardness: 9,
    sgMin: 3.98,
    sgMax: 4.06,
    riMin: 1.762,
    riMax: 1.778,
    cleavage: "None (basal and rhombohedral parting)",
    fracture: "Conchoidal, uneven",
    opticCharacter: "DR (Uniaxial negative)",
    pleochroism: "Moderate to strong dichroic",
    inclusions: ["Silk", "Crystals", "Feathers", "Fingerprints", "Color zoning", "Rutile"],
    uvResponse: "Variable; yellow sapphire shows apricot yellow",
    simulants: ["Synthetic sapphire", "Blue spinel", "Tanzanite", "Glass", "Doublets"],
    treatments: ["Heat treatment", "Beryllium diffusion", "Lattice diffusion", "Fracture filling"],
    occurrences: ["Sri Lanka", "Myanmar", "Kashmir", "Madagascar", "Thailand", "Australia"],
    indianName: "Neelam (blue) / Pukhraj (yellow)",
    category: "Precious",
    priceRangeINR: { min: 3000, max: 300000 },
    priceRangeUSD: { min: 35, max: 3500 },
    formation: "Forms in metamorphic rocks and igneous rocks. Found in pegmatites and alluvial deposits.",
    testingGuide: [
      "Check RI: 1.762-1.778 with birefringence of 0.008",
      "Check SG: 3.98-4.06",
      "Look for silk and color zoning",
      "Check for curved striae in synthetics",
      "Dichroism test: Blue sapphire shows blue and green-blue"
    ],
    marketDemand: "High"
  },
  {
    id: "emerald",
    variety: "Emerald",
    chemicalComposition: "Be₃Al₂Si₆O₁₈ (Beryl with Chromium/Vanadium)",
    crystalSystem: "Hexagonal",
    colors: ["Green", "Bluish-green", "Yellowish-green"],
    causeOfColor: "Chromium and/or Vanadium",
    transparency: ["Transparent", "Translucent"],
    luster: "Vitreous",
    hardness: 7.5,
    sgMin: 2.67,
    sgMax: 2.78,
    riMin: 1.565,
    riMax: 1.602,
    cleavage: "Poor basal cleavage",
    fracture: "Conchoidal to uneven",
    opticCharacter: "DR (Uniaxial negative)",
    pleochroism: "Moderate dichroic (blue-green to yellow-green)",
    inclusions: ["Jardin (garden)", "Three-phase inclusions", "Pyrite", "Calcite", "Tremolite"],
    uvResponse: "Usually inert; Colombian may show weak red",
    simulants: ["Synthetic emerald", "Green glass", "Green tourmaline", "Tsavorite", "Doublets"],
    treatments: ["Oil/resin filling", "Cedar oil treatment", "Opticon filling"],
    occurrences: ["Colombia", "Zambia", "Brazil", "Zimbabwe", "Afghanistan", "Russia"],
    indianName: "Panna",
    category: "Precious",
    priceRangeINR: { min: 4000, max: 400000 },
    priceRangeUSD: { min: 50, max: 5000 },
    formation: "Forms in hydrothermal veins and pegmatites where beryllium-rich fluids interact with chromium-bearing rocks.",
    testingGuide: [
      "Check RI: 1.565-1.602 with birefringence 0.005-0.009",
      "Check SG: 2.67-2.78 (varies by origin)",
      "Look for jardin inclusions (characteristic garden-like inclusions)",
      "Colombian emeralds often have three-phase inclusions",
      "Use Chelsea filter: Natural shows red, most synthetics don't"
    ],
    marketDemand: "High"
  },
  {
    id: "diamond",
    variety: "Diamond",
    chemicalComposition: "C (Carbon)",
    crystalSystem: "Cubic (Isometric)",
    colors: ["Colorless", "Yellow", "Brown", "Pink", "Blue", "Green", "Black"],
    causeOfColor: "Nitrogen (yellow), Boron (blue), Radiation (green), Defects (pink/red)",
    transparency: ["Transparent", "Translucent", "Opaque"],
    luster: "Adamantine",
    hardness: 10,
    sgMin: 3.51,
    sgMax: 3.53,
    riMin: 2.417,
    riMax: 2.419,
    cleavage: "Perfect octahedral",
    fracture: "Conchoidal",
    opticCharacter: "SR (Isotropic)",
    pleochroism: "None",
    inclusions: ["Crystals", "Feathers", "Clouds", "Pinpoints", "Needles"],
    uvResponse: "Variable; often blue fluorescence",
    simulants: ["Cubic Zirconia", "Moissanite", "White sapphire", "Glass", "Synthetic diamond"],
    treatments: ["HPHT", "Laser drilling", "Fracture filling", "Irradiation", "Coating"],
    occurrences: ["Botswana", "Russia", "Canada", "South Africa", "Australia", "India"],
    indianName: "Heera",
    category: "Precious",
    priceRangeINR: { min: 25000, max: 2500000 },
    priceRangeUSD: { min: 300, max: 30000 },
    formation: "Forms deep in the Earth's mantle under extreme pressure and temperature. Brought to surface by volcanic eruptions through kimberlite pipes.",
    testingGuide: [
      "Thermal conductivity test: Diamond conducts heat rapidly",
      "Check RI: 2.417 (very high, single refraction)",
      "Check SG: 3.52",
      "Look for characteristic inclusions under 10x loupe",
      "Use diamond tester (but beware of moissanite false positives)"
    ],
    marketDemand: "High"
  },
  {
    id: "topaz",
    variety: "Topaz",
    chemicalComposition: "Al₂SiO₄(F,OH)₂",
    crystalSystem: "Orthorhombic",
    colors: ["Colorless", "Yellow", "Orange", "Pink", "Blue", "Brown"],
    causeOfColor: "Color centers, Chromium (pink), Irradiation (blue)",
    transparency: ["Transparent"],
    luster: "Vitreous",
    hardness: 8,
    sgMin: 3.49,
    sgMax: 3.57,
    riMin: 1.609,
    riMax: 1.643,
    cleavage: "Perfect basal cleavage",
    fracture: "Conchoidal to uneven",
    opticCharacter: "DR (Biaxial positive)",
    pleochroism: "Weak to moderate trichroic",
    inclusions: ["Two-phase inclusions", "Crystals", "Cleavage cracks"],
    uvResponse: "Variable; some show weak fluorescence",
    simulants: ["Citrine", "Synthetic corundum", "Glass", "CZ"],
    treatments: ["Irradiation (blue)", "Heat treatment", "Coating"],
    occurrences: ["Brazil", "Sri Lanka", "Nigeria", "Russia", "Pakistan"],
    indianName: "Pushkaraj / Sunela",
    category: "Semi-precious",
    priceRangeINR: { min: 500, max: 50000 },
    priceRangeUSD: { min: 6, max: 600 },
    formation: "Forms in granite and rhyolite cavities, pegmatites, and alluvial deposits.",
    testingGuide: [
      "Check RI: 1.609-1.643 with birefringence 0.008-0.010",
      "Check SG: 3.49-3.57",
      "Test hardness: 8 on Mohs scale",
      "Perfect basal cleavage is characteristic",
      "Imperial topaz (orange-pink) is most valuable"
    ],
    marketDemand: "Medium"
  },
  {
    id: "spinel",
    variety: "Spinel",
    chemicalComposition: "MgAl₂O₄ (Magnesium Aluminium Oxide)",
    crystalSystem: "Cubic (Isometric)",
    colors: ["Red", "Pink", "Orange", "Blue", "Purple", "Black"],
    causeOfColor: "Chromium (red/pink), Iron (blue), Cobalt (violet-blue)",
    transparency: ["Transparent"],
    luster: "Vitreous",
    hardness: 8,
    sgMin: 3.58,
    sgMax: 3.61,
    riMin: 1.712,
    riMax: 1.736,
    cleavage: "None (indistinct octahedral parting)",
    fracture: "Conchoidal",
    opticCharacter: "SR (Isotropic)",
    pleochroism: "None",
    inclusions: ["Octahedral crystals", "Fingerprints", "Silk", "Zircon halos"],
    uvResponse: "Red spinel shows strong red fluorescence",
    simulants: ["Synthetic spinel", "Ruby", "Garnet", "Glass"],
    treatments: ["Generally untreated; some heat treatment"],
    occurrences: ["Myanmar", "Sri Lanka", "Tanzania", "Vietnam", "Tajikistan"],
    indianName: "Lal",
    category: "Semi-precious",
    priceRangeINR: { min: 2000, max: 200000 },
    priceRangeUSD: { min: 25, max: 2500 },
    formation: "Forms in metamorphic rocks, particularly marble and contact zones. Also found in alluvial deposits.",
    testingGuide: [
      "Check RI: 1.712-1.736 (single refraction)",
      "Check SG: 3.58-3.61 (lighter than ruby)",
      "Isotropic - no doubling of back facets",
      "Look for octahedral crystal inclusions",
      "Red spinel fluoresces strongly under LW-UV"
    ],
    marketDemand: "High"
  },
  {
    id: "garnet",
    variety: "Garnet",
    chemicalComposition: "Variable (Silicate group)",
    crystalSystem: "Cubic (Isometric)",
    colors: ["Red", "Orange", "Green", "Purple", "Pink", "Brown"],
    causeOfColor: "Iron (almandine), Chromium (tsavorite), Manganese (spessartite)",
    transparency: ["Transparent", "Translucent"],
    luster: "Vitreous to resinous",
    hardness: 7,
    sgMin: 3.50,
    sgMax: 4.30,
    riMin: 1.714,
    riMax: 1.888,
    cleavage: "None (indistinct dodecahedral parting)",
    fracture: "Conchoidal to uneven",
    opticCharacter: "SR (Isotropic) - some show anomalous DR",
    pleochroism: "None (some varieties show anomalous)",
    inclusions: ["Horsetail (demantoid)", "Needles", "Crystals", "Fingerprints"],
    uvResponse: "Generally inert; some varieties show weak response",
    simulants: ["Glass", "CZ", "Synthetic garnet (YAG)"],
    treatments: ["Generally untreated"],
    occurrences: ["India", "Sri Lanka", "Tanzania", "Madagascar", "Russia", "Kenya"],
    indianName: "Gomed (hessonite) / Tamra",
    category: "Semi-precious",
    priceRangeINR: { min: 500, max: 100000 },
    priceRangeUSD: { min: 6, max: 1200 },
    formation: "Forms in metamorphic rocks and some igneous rocks. Found in schists, gneisses, and skarn deposits.",
    testingGuide: [
      "Check RI: Varies by type (1.714-1.888)",
      "Check SG: 3.50-4.30 (varies by type)",
      "Isotropic - single refraction",
      "Demantoid: Look for horsetail inclusions",
      "Hessonite: Look for roiled/treacly appearance"
    ],
    marketDemand: "Medium"
  },
  {
    id: "tourmaline",
    variety: "Tourmaline",
    chemicalComposition: "Complex borosilicate",
    crystalSystem: "Trigonal",
    colors: ["Green", "Pink", "Blue", "Red", "Yellow", "Black", "Bi-color", "Watermelon"],
    causeOfColor: "Iron (green/blue), Manganese (pink/red), Copper (Paraiba)",
    transparency: ["Transparent", "Translucent"],
    luster: "Vitreous",
    hardness: 7.5,
    sgMin: 3.02,
    sgMax: 3.26,
    riMin: 1.624,
    riMax: 1.644,
    cleavage: "Poor/indistinct",
    fracture: "Conchoidal to uneven",
    opticCharacter: "DR (Uniaxial negative)",
    pleochroism: "Strong dichroic",
    inclusions: ["Tubes", "Crystals", "Fractures", "Fingerprints", "Trichites"],
    uvResponse: "Generally inert; some show weak fluorescence",
    simulants: ["Glass", "Synthetic tourmaline (rare)", "Other colored gems"],
    treatments: ["Heat treatment", "Irradiation", "Fracture filling (rare)"],
    occurrences: ["Brazil", "Nigeria", "Mozambique", "Afghanistan", "Sri Lanka", "Madagascar"],
    indianName: "Turmali",
    category: "Semi-precious",
    priceRangeINR: { min: 1000, max: 150000 },
    priceRangeUSD: { min: 12, max: 1800 },
    formation: "Forms in granite pegmatites and metamorphic rocks. Often found in crystal pockets.",
    testingGuide: [
      "Check RI: 1.624-1.644 with birefringence 0.018-0.040",
      "Check SG: 3.02-3.26",
      "Strong pleochroism is characteristic",
      "Look for parallel tube inclusions",
      "Paraiba tourmaline: Copper content, neon blue-green color"
    ],
    marketDemand: "Medium"
  },
  {
    id: "amethyst",
    variety: "Amethyst",
    chemicalComposition: "SiO₂ (Silicon Dioxide - Quartz)",
    crystalSystem: "Trigonal",
    colors: ["Purple", "Violet", "Bluish-purple"],
    causeOfColor: "Iron and irradiation",
    transparency: ["Transparent"],
    luster: "Vitreous",
    hardness: 7,
    sgMin: 2.63,
    sgMax: 2.65,
    riMin: 1.544,
    riMax: 1.553,
    cleavage: "None",
    fracture: "Conchoidal",
    opticCharacter: "DR (Uniaxial positive)",
    pleochroism: "Weak dichroic (purple to reddish-purple)",
    inclusions: ["Tiger stripes", "Color zoning", "Feathers", "Two-phase inclusions"],
    uvResponse: "Generally inert",
    simulants: ["Glass", "Synthetic amethyst", "Cubic zirconia"],
    treatments: ["Heat treatment (may turn citrine)", "Irradiation"],
    occurrences: ["Brazil", "Uruguay", "Zambia", "Bolivia", "Madagascar"],
    indianName: "Katela / Jamunia",
    category: "Semi-precious",
    priceRangeINR: { min: 200, max: 10000 },
    priceRangeUSD: { min: 2, max: 120 },
    formation: "Forms in volcanic rocks and hydrothermal veins. Found in geodes and cavities.",
    testingGuide: [
      "Check RI: 1.544-1.553 (typical quartz values)",
      "Check SG: 2.63-2.65",
      "Look for color zoning (tiger stripes)",
      "No cleavage, conchoidal fracture",
      "Heat may turn to citrine or fade color"
    ],
    marketDemand: "Medium"
  },
  {
    id: "citrine",
    variety: "Citrine",
    chemicalComposition: "SiO₂ (Silicon Dioxide - Quartz)",
    crystalSystem: "Trigonal",
    colors: ["Yellow", "Orange", "Golden-brown", "Reddish-orange"],
    causeOfColor: "Iron and heat treatment",
    transparency: ["Transparent"],
    luster: "Vitreous",
    hardness: 7,
    sgMin: 2.63,
    sgMax: 2.65,
    riMin: 1.544,
    riMax: 1.553,
    cleavage: "None",
    fracture: "Conchoidal",
    opticCharacter: "DR (Uniaxial positive)",
    pleochroism: "Very weak",
    inclusions: ["Feathers", "Fingerprints", "Two-phase inclusions"],
    uvResponse: "Generally inert",
    simulants: ["Glass", "Synthetic citrine", "Yellow topaz"],
    treatments: ["Heat treatment (from amethyst)"],
    occurrences: ["Brazil", "Madagascar", "Zambia", "Spain", "Russia"],
    indianName: "Sunela",
    category: "Semi-precious",
    priceRangeINR: { min: 150, max: 8000 },
    priceRangeUSD: { min: 2, max: 100 },
    formation: "Natural citrine is rare. Most commercial citrine is heat-treated amethyst or smoky quartz.",
    testingGuide: [
      "Check RI: 1.544-1.553",
      "Check SG: 2.63-2.65",
      "Natural citrine has subtle color; heated has reddish tint",
      "No cleavage, conchoidal fracture",
      "Often sold as 'golden topaz' (misleading name)"
    ],
    marketDemand: "Medium"
  },
  {
    id: "peridot",
    variety: "Peridot",
    chemicalComposition: "(Mg,Fe)₂SiO₄ (Olivine)",
    crystalSystem: "Orthorhombic",
    colors: ["Green", "Yellow-green", "Olive green"],
    causeOfColor: "Iron",
    transparency: ["Transparent"],
    luster: "Vitreous to oily",
    hardness: 6.5,
    sgMin: 3.27,
    sgMax: 3.37,
    riMin: 1.650,
    riMax: 1.703,
    cleavage: "Distinct prismatic",
    fracture: "Conchoidal",
    opticCharacter: "DR (Biaxial positive/negative)",
    pleochroism: "Weak trichroic",
    inclusions: ["Lily pad inclusions", "Chromite crystals", "Ludwigite needles"],
    uvResponse: "Inert",
    simulants: ["Glass", "Synthetic peridot (rare)", "Green tourmaline"],
    treatments: ["Generally untreated"],
    occurrences: ["Pakistan", "Myanmar", "China", "USA (Arizona)", "Egypt"],
    indianName: "Zabarjad",
    category: "Semi-precious",
    priceRangeINR: { min: 300, max: 15000 },
    priceRangeUSD: { min: 4, max: 180 },
    formation: "Forms in mafic and ultramafic igneous rocks. Also found in meteorites (pallasite).",
    testingGuide: [
      "Check RI: 1.650-1.703 (high birefringence 0.035-0.038)",
      "Check SG: 3.27-3.37",
      "Strong doubling of back facets",
      "Look for lily pad inclusions",
      "Characteristic yellow-green color"
    ],
    marketDemand: "Medium"
  },
  {
    id: "opal",
    variety: "Opal",
    chemicalComposition: "SiO₂·nH₂O (Hydrated Silica)",
    crystalSystem: "Amorphous",
    colors: ["White", "Black", "Orange (fire)", "Colorless", "Play of color"],
    causeOfColor: "Play of color from silica sphere diffraction",
    transparency: ["Transparent", "Translucent", "Opaque"],
    luster: "Vitreous to waxy",
    hardness: 5.5,
    sgMin: 1.98,
    sgMax: 2.25,
    riMin: 1.370,
    riMax: 1.520,
    cleavage: "None",
    fracture: "Conchoidal",
    opticCharacter: "SR (Isotropic) - amorphous",
    pleochroism: "None",
    inclusions: ["Play of color patterns", "Sand (matrix)", "Potch"],
    uvResponse: "Variable; some show fluorescence",
    simulants: ["Synthetic opal", "Glass", "Opal doublets/triplets", "Plastic"],
    treatments: ["Sugar/smoke treatment (black opal)", "Impregnation", "Coating"],
    occurrences: ["Australia", "Ethiopia", "Mexico", "Brazil", "USA"],
    indianName: "Opal / Dudhiya",
    category: "Semi-precious",
    priceRangeINR: { min: 500, max: 100000 },
    priceRangeUSD: { min: 6, max: 1200 },
    formation: "Forms from silica-rich solutions that fill voids and cavities in rocks over millions of years.",
    testingGuide: [
      "Check RI: 1.370-1.520 (lower than most gems)",
      "Check SG: 1.98-2.25 (very light)",
      "Amorphous - no crystal structure",
      "Check for doublet/triplet assembly",
      "Ethiopian opal may be hydrophane (absorbs water)"
    ],
    marketDemand: "Medium"
  },
  {
    id: "aquamarine",
    variety: "Aquamarine",
    chemicalComposition: "Be₃Al₂Si₆O₁₈ (Beryl)",
    crystalSystem: "Hexagonal",
    colors: ["Blue", "Blue-green", "Light blue"],
    causeOfColor: "Iron (Fe²⁺)",
    transparency: ["Transparent"],
    luster: "Vitreous",
    hardness: 7.5,
    sgMin: 2.68,
    sgMax: 2.74,
    riMin: 1.564,
    riMax: 1.596,
    cleavage: "Indistinct basal",
    fracture: "Conchoidal to uneven",
    opticCharacter: "DR (Uniaxial negative)",
    pleochroism: "Weak to moderate dichroic (blue to colorless)",
    inclusions: ["Rain (parallel tubes)", "Fingerprints", "Two-phase inclusions"],
    uvResponse: "Generally inert",
    simulants: ["Blue topaz", "Blue glass", "Synthetic spinel", "Blue zircon"],
    treatments: ["Heat treatment (to enhance blue)"],
    occurrences: ["Brazil", "Pakistan", "Madagascar", "Nigeria", "Zambia"],
    indianName: "Beruj",
    category: "Semi-precious",
    priceRangeINR: { min: 1000, max: 50000 },
    priceRangeUSD: { min: 12, max: 600 },
    formation: "Forms in granite pegmatites. Found with other beryl varieties.",
    testingGuide: [
      "Check RI: 1.564-1.596 (beryl range)",
      "Check SG: 2.68-2.74",
      "Look for parallel tube inclusions (rain)",
      "Heat treatment is common and stable",
      "Dichroism: Blue to near colorless"
    ],
    marketDemand: "Medium"
  },
  {
    id: "tanzanite",
    variety: "Tanzanite",
    chemicalComposition: "Ca₂Al₃(SiO₄)(Si₂O₇)O(OH) (Zoisite)",
    crystalSystem: "Orthorhombic",
    colors: ["Blue", "Violet", "Purple-blue"],
    causeOfColor: "Vanadium",
    transparency: ["Transparent"],
    luster: "Vitreous",
    hardness: 6.5,
    sgMin: 3.28,
    sgMax: 3.35,
    riMin: 1.691,
    riMax: 1.700,
    cleavage: "Perfect in one direction",
    fracture: "Conchoidal to uneven",
    opticCharacter: "DR (Biaxial positive)",
    pleochroism: "Strong trichroic (blue, purple, brown/burgundy)",
    inclusions: ["Growth tubes", "Fingerprints", "Crystals"],
    uvResponse: "Inert",
    simulants: ["Synthetic forsterite", "Blue sapphire", "Blue glass", "CZ"],
    treatments: ["Heat treatment (almost always - removes brown)"],
    occurrences: ["Tanzania (only source)"],
    indianName: "Tanzanite",
    category: "Semi-precious",
    priceRangeINR: { min: 5000, max: 150000 },
    priceRangeUSD: { min: 60, max: 1800 },
    formation: "Found only in Tanzania near Mount Kilimanjaro. Forms in metamorphic rocks.",
    testingGuide: [
      "Check RI: 1.691-1.700",
      "Check SG: 3.28-3.35",
      "Strong trichroism is diagnostic",
      "Perfect cleavage - handle with care",
      "Almost always heat treated (disclosure standard)"
    ],
    marketDemand: "High"
  },
  {
    id: "zircon",
    variety: "Zircon",
    chemicalComposition: "ZrSiO₄ (Zirconium Silicate)",
    crystalSystem: "Tetragonal",
    colors: ["Blue", "Colorless", "Yellow", "Orange", "Green", "Brown"],
    causeOfColor: "Trace elements and radiation damage",
    transparency: ["Transparent", "Translucent"],
    luster: "Adamantine to vitreous",
    hardness: 7.5,
    sgMin: 3.93,
    sgMax: 4.73,
    riMin: 1.810,
    riMax: 2.024,
    cleavage: "Imperfect prismatic",
    fracture: "Conchoidal",
    opticCharacter: "DR (Uniaxial positive) - high birefringence",
    pleochroism: "Weak to moderate dichroic",
    inclusions: ["Crystals", "Tension cracks", "Angular zoning"],
    uvResponse: "Variable; some show yellow-orange fluorescence",
    simulants: ["CZ (different material)", "Diamond", "Synthetic rutile"],
    treatments: ["Heat treatment (blue and colorless)", "Irradiation"],
    occurrences: ["Sri Lanka", "Cambodia", "Myanmar", "Australia", "Tanzania"],
    indianName: "Jarkan",
    category: "Semi-precious",
    priceRangeINR: { min: 800, max: 30000 },
    priceRangeUSD: { min: 10, max: 360 },
    formation: "Forms in igneous rocks and sedimentary deposits. One of the oldest minerals on Earth.",
    testingGuide: [
      "Check RI: 1.810-2.024 (very high)",
      "Check SG: 3.93-4.73 (varies with metamict state)",
      "Very high birefringence causes strong doubling",
      "Adamantine luster similar to diamond",
      "Blue zircon is almost always heat treated"
    ],
    marketDemand: "Medium"
  },
  {
    id: "moonstone",
    variety: "Moonstone",
    chemicalComposition: "KAlSi₃O₈ (Orthoclase/Adularia Feldspar)",
    crystalSystem: "Monoclinic",
    colors: ["White", "Blue", "Peach", "Gray", "Rainbow"],
    causeOfColor: "Adularescence from layered structure",
    transparency: ["Transparent", "Translucent"],
    luster: "Vitreous to pearly",
    hardness: 6,
    sgMin: 2.56,
    sgMax: 2.59,
    riMin: 1.518,
    riMax: 1.526,
    cleavage: "Perfect in two directions",
    fracture: "Uneven to conchoidal",
    opticCharacter: "DR (Biaxial negative)",
    pleochroism: "None",
    inclusions: ["Centipedes", "Stress cracks", "Fingerprints"],
    uvResponse: "Generally inert; some show weak blue",
    simulants: ["Opalite (glass)", "Synthetic moonstone", "White labradorite"],
    treatments: ["Generally untreated; some coating"],
    occurrences: ["Sri Lanka", "India", "Myanmar", "Madagascar", "Tanzania"],
    indianName: "Chandrakant Mani",
    category: "Semi-precious",
    priceRangeINR: { min: 300, max: 25000 },
    priceRangeUSD: { min: 4, max: 300 },
    formation: "Forms in igneous and metamorphic rocks. The sheen comes from intergrown layers of different feldspars.",
    testingGuide: [
      "Check RI: 1.518-1.526 (feldspar range)",
      "Check SG: 2.56-2.59",
      "Look for adularescence (floating light)",
      "Two perfect cleavage directions",
      "Blue moonstone from Sri Lanka is most valuable"
    ],
    marketDemand: "Medium"
  },
  {
    id: "jade",
    variety: "Jade (Jadeite)",
    chemicalComposition: "NaAlSi₂O₆ (Jadeite Pyroxene)",
    crystalSystem: "Monoclinic",
    colors: ["Green", "Lavender", "White", "Yellow", "Orange", "Black"],
    causeOfColor: "Chromium (green), Iron (yellow/orange), Manganese (lavender)",
    transparency: ["Translucent", "Opaque"],
    luster: "Vitreous to greasy",
    hardness: 7,
    sgMin: 3.30,
    sgMax: 3.38,
    riMin: 1.654,
    riMax: 1.688,
    cleavage: "Prismatic (rarely seen due to interlocking structure)",
    fracture: "Splintery to granular",
    opticCharacter: "DR (Aggregate)",
    pleochroism: "None (aggregate)",
    inclusions: ["Fibrous structure", "Crystals", "Veins"],
    uvResponse: "Variable; some show weak to moderate green/yellow",
    simulants: ["Nephrite", "Serpentine", "Aventurine quartz", "Glass", "Dyed materials"],
    treatments: ["Bleaching", "Polymer impregnation (B jade)", "Dyeing (C jade)"],
    occurrences: ["Myanmar", "Guatemala", "Japan", "Russia", "California"],
    indianName: "Hassonite / Jade",
    category: "Semi-precious",
    priceRangeINR: { min: 2000, max: 500000 },
    priceRangeUSD: { min: 25, max: 6000 },
    formation: "Forms under high pressure in metamorphic rocks along subduction zones.",
    testingGuide: [
      "Check RI: 1.654-1.688 (spot reading ~1.66)",
      "Check SG: 3.30-3.38 (jadeite) vs 2.90-3.03 (nephrite)",
      "Look for fibrous/granular texture",
      "Imperial jade (vivid green) is most valuable",
      "Check for B/C treatment with UV and magnification"
    ],
    marketDemand: "High"
  },
  {
    id: "turquoise",
    variety: "Turquoise",
    chemicalComposition: "CuAl₆(PO₄)₄(OH)₈·4H₂O",
    crystalSystem: "Triclinic",
    colors: ["Blue", "Blue-green", "Green"],
    causeOfColor: "Copper (blue), Iron (green tint)",
    transparency: ["Opaque"],
    luster: "Waxy to dull",
    hardness: 5.5,
    sgMin: 2.60,
    sgMax: 2.90,
    riMin: 1.610,
    riMax: 1.650,
    cleavage: "Good (rarely seen)",
    fracture: "Conchoidal to smooth",
    opticCharacter: "DR (Aggregate)",
    pleochroism: "None",
    inclusions: ["Matrix (web patterns)", "Limonite", "Pyrite"],
    uvResponse: "Variable; some show weak green-yellow",
    simulants: ["Howlite (dyed)", "Magnesite", "Glass", "Plastic", "Reconstituted turquoise"],
    treatments: ["Stabilization", "Waxing", "Dyeing", "Backing"],
    occurrences: ["Iran", "USA (Arizona, Nevada)", "China", "Egypt", "Mexico"],
    indianName: "Firoza",
    category: "Semi-precious",
    priceRangeINR: { min: 200, max: 20000 },
    priceRangeUSD: { min: 2, max: 240 },
    formation: "Forms in arid regions where copper-bearing solutions react with aluminum-rich rocks.",
    testingGuide: [
      "Check RI: Spot reading around 1.61-1.65",
      "Check SG: 2.60-2.90",
      "Look for natural matrix patterns",
      "Hot needle test for plastic imitations",
      "Persian turquoise (robin's egg blue) is most valuable"
    ],
    marketDemand: "Medium"
  },
  {
    id: "lapis-lazuli",
    variety: "Lapis Lazuli",
    chemicalComposition: "Rock: Lazurite, Calcite, Pyrite",
    crystalSystem: "Cubic (Lazurite component)",
    colors: ["Blue", "Violet-blue", "Greenish-blue"],
    causeOfColor: "Sulfur in lazurite structure",
    transparency: ["Opaque"],
    luster: "Vitreous to dull",
    hardness: 5.5,
    sgMin: 2.70,
    sgMax: 2.90,
    riMin: 1.500,
    riMax: 1.550,
    cleavage: "None (rock)",
    fracture: "Uneven",
    opticCharacter: "Aggregate (rock)",
    pleochroism: "None",
    inclusions: ["Pyrite specks", "Calcite veins", "White spots"],
    uvResponse: "Orange to white fluorescence (from calcite)",
    simulants: ["Sodalite", "Dyed howlite", "Synthetic lapis", "Glass"],
    treatments: ["Dyeing", "Waxing", "Impregnation"],
    occurrences: ["Afghanistan", "Chile", "Russia", "Pakistan"],
    indianName: "Lajward",
    category: "Semi-precious",
    priceRangeINR: { min: 300, max: 15000 },
    priceRangeUSD: { min: 4, max: 180 },
    formation: "Forms in limestone contact zones with igneous intrusions. Afghan lapis is considered finest.",
    testingGuide: [
      "Check SG: 2.70-2.90",
      "Look for golden pyrite specks (desirable)",
      "White calcite reduces value",
      "Acetone test for dye (rub with solvent)",
      "Best quality has uniform deep blue with fine pyrite"
    ],
    marketDemand: "Medium"
  },
  {
    id: "alexandrite",
    variety: "Alexandrite",
    chemicalComposition: "BeAl₂O₄ (Chrysoberyl with Cr)",
    crystalSystem: "Orthorhombic",
    colors: ["Green (daylight)", "Red (incandescent)"],
    causeOfColor: "Chromium (color change effect)",
    transparency: ["Transparent"],
    luster: "Vitreous",
    hardness: 8.5,
    sgMin: 3.70,
    sgMax: 3.73,
    riMin: 1.746,
    riMax: 1.755,
    cleavage: "Distinct in one direction",
    fracture: "Conchoidal",
    opticCharacter: "DR (Biaxial positive)",
    pleochroism: "Strong trichroic (green, orange, purple-red)",
    inclusions: ["Silk", "Fingerprints", "Crystals", "Growth tubes"],
    uvResponse: "Moderate red under LW-UV",
    simulants: ["Synthetic alexandrite", "Color-change sapphire", "Color-change garnet"],
    treatments: ["Generally untreated"],
    occurrences: ["Russia (original)", "Sri Lanka", "Brazil", "Tanzania", "India"],
    indianName: "Vaidurya",
    category: "Precious",
    priceRangeINR: { min: 50000, max: 1000000 },
    priceRangeUSD: { min: 600, max: 12000 },
    formation: "Forms in pegmatites and mica schists where beryllium and chromium occur together (rare).",
    testingGuide: [
      "Check RI: 1.746-1.755",
      "Check SG: 3.70-3.73",
      "Observe color change: Green to red is diagnostic",
      "Strong trichroism",
      "Russian alexandrite shows best color change"
    ],
    marketDemand: "High"
  }
];

export const GEM_CATEGORIES = ["All", "Precious", "Semi-precious", "Organic"] as const;

export const CRYSTAL_SYSTEMS = [
  "Cubic",
  "Tetragonal",
  "Hexagonal",
  "Trigonal",
  "Orthorhombic",
  "Monoclinic",
  "Triclinic",
  "Amorphous"
] as const;

export const TRANSPARENCY_OPTIONS = [
  "Transparent",
  "Translucent",
  "Opaque"
] as const;

export const LUSTER_OPTIONS = [
  "Adamantine",
  "Vitreous",
  "Waxy",
  "Pearly",
  "Silky",
  "Resinous",
  "Dull"
] as const;

export const COMMON_INCLUSIONS = [
  "Silk",
  "Needles",
  "Crystals",
  "Feathers",
  "Fingerprints",
  "Two-phase",
  "Three-phase",
  "Color zoning",
  "Growth tubes",
  "Rutile",
  "Pyrite"
] as const;

export const TREATMENT_OPTIONS = [
  "None",
  "Heat treatment",
  "Irradiation",
  "Filling",
  "Coating",
  "Diffusion",
  "Dyeing",
  "Oiling"
] as const;

export const COMMON_COLORS = [
  "Colorless",
  "Red",
  "Pink",
  "Orange",
  "Yellow",
  "Green",
  "Blue",
  "Purple",
  "Brown",
  "Black",
  "White",
  "Gray"
] as const;

export function identifyGemstone(params: {
  riMin?: number;
  riMax?: number;
  sg?: number;
  color?: string;
  transparency?: string;
  hardness?: number;
  pleochroism?: string;
  crystalSystem?: string;
}): { gemstone: Gemstone; confidence: number; reasons: string[] }[] {
  const results: { gemstone: Gemstone; confidence: number; reasons: string[] }[] = [];

  for (const gem of GEMSTONE_DATABASE) {
    let score = 0;
    let maxScore = 0;
    const reasons: string[] = [];

    if (params.riMin !== undefined && params.riMax !== undefined) {
      maxScore += 30;
      if (params.riMin >= gem.riMin - 0.01 && params.riMax <= gem.riMax + 0.01) {
        score += 30;
        reasons.push(`RI ${params.riMin}-${params.riMax} matches ${gem.variety} range`);
      } else if (Math.abs(params.riMin - gem.riMin) < 0.05) {
        score += 15;
        reasons.push(`RI partially matches ${gem.variety}`);
      }
    }

    if (params.sg !== undefined) {
      maxScore += 25;
      if (params.sg >= gem.sgMin - 0.05 && params.sg <= gem.sgMax + 0.05) {
        score += 25;
        reasons.push(`SG ${params.sg} matches ${gem.variety} range`);
      } else if (Math.abs(params.sg - gem.sgMin) < 0.2) {
        score += 12;
        reasons.push(`SG close to ${gem.variety} range`);
      }
    }

    if (params.color) {
      maxScore += 20;
      const colorMatch = gem.colors.some(c => 
        c.toLowerCase().includes(params.color!.toLowerCase()) ||
        params.color!.toLowerCase().includes(c.toLowerCase())
      );
      if (colorMatch) {
        score += 20;
        reasons.push(`Color ${params.color} matches ${gem.variety}`);
      }
    }

    if (params.hardness !== undefined) {
      maxScore += 15;
      if (Math.abs(params.hardness - gem.hardness) <= 0.5) {
        score += 15;
        reasons.push(`Hardness ${params.hardness} matches ${gem.variety}`);
      } else if (Math.abs(params.hardness - gem.hardness) <= 1) {
        score += 8;
        reasons.push(`Hardness close to ${gem.variety}`);
      }
    }

    if (params.crystalSystem) {
      maxScore += 10;
      if (gem.crystalSystem.toLowerCase() === params.crystalSystem.toLowerCase()) {
        score += 10;
        reasons.push(`Crystal system matches ${gem.variety}`);
      }
    }

    if (maxScore > 0) {
      const confidence = Math.round((score / maxScore) * 100);
      if (confidence > 20) {
        results.push({ gemstone: gem, confidence, reasons });
      }
    }
  }

  return results.sort((a, b) => b.confidence - a.confidence).slice(0, 5);
}
