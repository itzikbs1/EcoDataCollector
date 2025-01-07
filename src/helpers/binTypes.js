// binTypes.js
export const STANDARD_BIN_TYPES = {
    PLASTIC: 'Plastic',
    PAPER: 'Paper',
    GLASS: 'Glass',
    ELECTRONIC: 'Electronic',
    TEXTILE: 'Textile',
    PACKAGING: 'Packaging',
    CARDBOARD: 'Cardboard'
};

export const binTypeMappings = {
    // Glass variations
    'glass': STANDARD_BIN_TYPES.GLASS,
    'זכוכית': STANDARD_BIN_TYPES.GLASS,
    'מיחזור זכוכית': STANDARD_BIN_TYPES.GLASS,
    'מתקן זכוכית': STANDARD_BIN_TYPES.GLASS,
    'Glass': STANDARD_BIN_TYPES.GLASS,

    // Paper variations
    'נייר': STANDARD_BIN_TYPES.PAPER,
    'מיחזור נייר': STANDARD_BIN_TYPES.PAPER,
    'Paper': STANDARD_BIN_TYPES.PAPER,
    'מיכל כחול': STANDARD_BIN_TYPES.PAPER,  // Blue bin is typically for paper

    // Cardboard variations (separated from paper)
    'קרטון': STANDARD_BIN_TYPES.CARDBOARD,
    'קרטונים': STANDARD_BIN_TYPES.CARDBOARD,
    'מיחזור קרטוניות': STANDARD_BIN_TYPES.CARDBOARD,
    'קרטוניה': STANDARD_BIN_TYPES.CARDBOARD,
    'Cardboard': STANDARD_BIN_TYPES.CARDBOARD,
    'boxes': STANDARD_BIN_TYPES.CARDBOARD,

    // Electronic variations
    'אלקטרונית': STANDARD_BIN_TYPES.ELECTRONIC,
    'Electronics': STANDARD_BIN_TYPES.ELECTRONIC,
    'מיחזור פסולת אלקטרונית': STANDARD_BIN_TYPES.ELECTRONIC,
    'מתקן אלקטרוניקה': STANDARD_BIN_TYPES.ELECTRONIC,
    'מיכל לאיסוף סוללות': STANDARD_BIN_TYPES.ELECTRONIC,

    // Textile variations
    'טקסטיל': STANDARD_BIN_TYPES.TEXTILE,
    'מיחזור טקסטיל': STANDARD_BIN_TYPES.TEXTILE,
    'Textile': STANDARD_BIN_TYPES.TEXTILE,
    'מתקן טקסטיל': STANDARD_BIN_TYPES.TEXTILE,

    // Packaging variations
    'אריזות': STANDARD_BIN_TYPES.PACKAGING,
    'Packaging': STANDARD_BIN_TYPES.PACKAGING,
    'מתקן אריזות': STANDARD_BIN_TYPES.PACKAGING,

    // Plastic variations
    'פלסטיק': STANDARD_BIN_TYPES.PLASTIC,
    'Plastic': STANDARD_BIN_TYPES.PLASTIC,
    'מיכל כתום':STANDARD_BIN_TYPES.PLASTIC
};
export function getStandardType(input) {
    if (!input) return null;
    return binTypeMappings[input] || null;
}