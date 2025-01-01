class AddressHandler {
    static cleanAddress(address) {
        if (!address || typeof address !== 'string') {
            return { street: '', houseNumber: null };
        }

        // Remove city name and initial cleanup
        let cleanedAddress = address
            .replace(/ראשון לציון/g, '')
            .replace(/,.*$/, '')
            .trim();

        let street = cleanedAddress;
        let houseNumber = null;

        // Handle special locations
        if (cleanedAddress.includes('בית המשפט')) {
            return { street: 'ישראל גלילי', houseNumber: '5' };
        }

        // Handle corner cases first (פינת)
        if (cleanedAddress.includes('פינת')) {
            street = cleanedAddress.split('פינת')[0].trim();
        }
        // Handle backslash cases
        else if (cleanedAddress.includes('\\')) {
            street = cleanedAddress.split('\\')[0].trim();
        }
        // Handle 'opposite' cases (מול)
        else if (cleanedAddress.includes('מול')) {
            const parts = cleanedAddress.split('מול');
            street = parts[0].trim();
            const number = parts[1]?.replace(/[^\d]/g, '');
            if (number) {
                houseNumber = number;
            }
        }
        // Regular address with number
        else {
            const match = cleanedAddress.match(/^(.*?)\s*(\d+)?$/);
            if (match) {
                [, street, houseNumber] = match;
            }
        }

        // Remove common descriptive phrases
        const phrasesToRemove = [
            'ליד הדואר',
            'ליד התחנה',
            'ליד גן הילדים',
            'במרכז המסחרי',
            'בגינה הציבורית',
            'בכיכר',
            'בסמטה',
            'מיתחם',
            'בצמוד',
            'סוף',
            '\\\\'
        ];

        phrasesToRemove.forEach(phrase => {
            street = street.replace(new RegExp(phrase, 'g'), '');
        });

        // Remove parenthetical content
        street = street.replace(/\(.*?\)/g, '');

        // Clean up street prefixes
        street = street
            .replace(/^רח'|^רחוב\s*/, '')
            .replace(/^שד'|^שדרות\s*/, 'שדרות ');

        // Special case handling for problematic addresses
        const specialCases = {
            'הדייגים': 'הדייגים',
            'שלמה עיראקי': 'שלמה עיראקי',
            'חיל רגלים': 'חיל רגלים',
            'ההתיישבות': 'ההתיישבות',
            'הארגמן': 'הארגמן',
            'נלי זקס': 'נלי זקס',
            'מורי גלמן': 'מורי גלמן'
        };

        for (const [key, value] of Object.entries(specialCases)) {
            if (street.includes(key)) {
                street = value;
                break;
            }
        }

        // Normalize spaces and ensure non-empty street name
        street = street.replace(/\s+/g, ' ').trim() || 'unknown';

        return { street, houseNumber };
    }

    static formatForGeocoding(address, city) {
        if (!address || !city) {
            return '';
        }

        const { street, houseNumber } = this.cleanAddress(address);
        let formattedAddress = street;
        
        if (houseNumber) {
            formattedAddress += ` ${houseNumber}`;
        }
        
        formattedAddress += `, ${city}, Israel`;
        return formattedAddress;
    }
}

export default AddressHandler;