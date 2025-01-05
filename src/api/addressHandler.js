import { getAddressMapping } from './addressMappings.js';

class AddressHandler {
    static cleanAddress(address) {
        if (!address || typeof address !== 'string') {
            return { street: '', houseNumber: null };
        }

        // First check if there's a mapping for this address
        const mappedAddress = getAddressMapping(address);
        
        // Then process the mapped or original address
        return this._cleanAddressInternal(mappedAddress);
    }

    static _cleanAddressInternal(address) {
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
        // Handle slash cases (/)
        else if (cleanedAddress.includes('/')) {
            street = cleanedAddress.split('/')[0].trim();
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

        // Normalize spaces and ensure non-empty street name
        street = street.replace(/\s+/g, ' ').trim() || 'unknown';

        return { street, houseNumber };
    }

    static formatForGeocoding(address, city) {
        if (!address || !city) {
            return '';
        }

        // Get the mapped address if it exists
        const mappedAddress = getAddressMapping(address);
        
        // For the special case of Shlonsky which is already in English
        if (mappedAddress.toLowerCase().startsWith('shlonsky')) {
            return `${mappedAddress}, ${city}, Israel`;
        }

        // For all other cases, proceed with normal cleaning and formatting
        const { street, houseNumber } = this.cleanAddress(mappedAddress);
        let formattedAddress = street;
        
        if (houseNumber) {
            formattedAddress += ` ${houseNumber}`;
        }
        
        formattedAddress += `, ${city}, Israel`;
        return formattedAddress;
    }
}

export default AddressHandler;