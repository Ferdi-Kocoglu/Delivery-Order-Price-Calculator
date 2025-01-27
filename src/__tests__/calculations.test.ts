import {
  calculateDistance,
  calculateDeliveryFee,
  eurosToCents,
  formatEuros,
  validateCoordinates,
  parseCoordinates,
  validateEuroString,
  formatDistance,
  validateInputs,
  validateDeliveryDistance,
  validateCartValue
} from '../Utils/calculations';

describe('Delivery Calculator Utilities', () => {
  const mockDistanceRanges = [
    { min: 0, max: 1000, a: 100, b: 1, flag: null },
    { min: 1000, max: 2000, a: 200, b: 2, flag: null },
    { min: 2000, max: 0, a: 0, b: 0, flag: null }  // Delivery not available for >= 2000m
  ];

  describe('calculateDeliveryFee', () => {
    test('calculates fee correctly for distance < 500m', () => {
      const fee = calculateDeliveryFee(500, 199, mockDistanceRanges);
      // base_price + a + (b * distance / 10) = 199 + 100 + (1 * 500 / 10) = 349
      expect(fee).toBe(349);
    });

    test('calculates fee correctly at range boundaries', () => {
      // At exactly 0m
      expect(calculateDeliveryFee(0, 199, mockDistanceRanges)).toBe(299); // 199 + 100 + (1 * 0 / 10)
      
      // At 999m (just before first range boundary)
      expect(calculateDeliveryFee(999, 199, mockDistanceRanges)).toBe(399); // 199 + 100 + (1 * 999 / 10)
      
      // At 1000m (start of second range)
      expect(calculateDeliveryFee(1000, 199, mockDistanceRanges)).toBe(599); // 199 + 200 + (2 * 1000 / 10)
      
      // At 1999m (just before delivery becomes unavailable)
      expect(calculateDeliveryFee(1999, 199, mockDistanceRanges)).toBe(799); // 199 + 200 + (2 * 1999 / 10)
    });

    test('handles rounding correctly', () => {
      // Testing with distances that produce fractional results
      const fee1 = calculateDeliveryFee(155, 199, mockDistanceRanges);
      // 199 + 100 + (1 * 155 / 10) = 199 + 100 + 16 = 315
      expect(fee1).toBe(315);

      const fee2 = calculateDeliveryFee(1156, 199, mockDistanceRanges);
      // 199 + 200 + (2 * 1156 / 10) = 199 + 200 + 231 = 630
      expect(fee2).toBe(630);
    });

    test('validates input parameters', () => {
      expect(() => {
        calculateDeliveryFee(-100, 190, mockDistanceRanges);
      }).toThrow('Distance cannot be negative');

      expect(() => {
        calculateDeliveryFee(2000, 190, mockDistanceRanges);
      }).toThrow('Delivery not available for this distance');
    });

    test('validates distance ranges configuration', () => {
      const invalidRanges = [
        { min: 100, max: 1000, a: 100, b: 1, flag: null }, // Doesn't start at 0
        { min: 1000, max: 0, a: 0, b: 0, flag: null }
      ];

      expect(() => {
        calculateDeliveryFee(500, 199, invalidRanges);
      }).toThrow('Invalid distance ranges configuration');

      const discontinuousRanges = [
        { min: 0, max: 1000, a: 100, b: 1, flag: null },
        { min: 2000, max: 3000, a: 200, b: 2, flag: null }, // Gap between ranges
        { min: 3000, max: 0, a: 0, b: 0, flag: null }
      ];

      expect(() => {
        calculateDeliveryFee(1500, 199, discontinuousRanges);
      }).toThrow('No applicable distance range found');
    });

    test('handles empty distance ranges', () => {
      expect(() => {
        calculateDeliveryFee(500, 199, []);
      }).toThrow('Invalid distance ranges configuration');
    });

    test('handles null delivery fee cases', () => {
      // Test when distance is exactly at max range
      expect(() => {
        calculateDeliveryFee(2000, 190, mockDistanceRanges);
      }).toThrow('Delivery not available for this distance');

      // Test when no valid range is found
      const invalidRanges = [
        { min: 0, max: 500, a: 0, b: 0, flag: null },
        { min: 1000, max: 0, a: 0, b: 0, flag: null }
      ];
      expect(() => {
        calculateDeliveryFee(750, 190, invalidRanges);
      }).toThrow('No applicable distance range found');
    });

    test('handles edge cases in coordinate validation', () => {
      // Test coordinate range validation
      expect(() => {
        validateCoordinates(91, 24);
      }).toThrow('Invalid latitude');
      
      expect(() => {
        validateCoordinates(60, 181);
      }).toThrow('Invalid longitude');

      // Test decimal place validation
      const latWithTooManyDecimals = 60.12345678901234;
      const lonWithTooManyDecimals = 24.12345678901234;
      expect(() => {
        validateCoordinates(latWithTooManyDecimals, lonWithTooManyDecimals);
      }).toThrow();
    });
  });

  describe('eurosToCents', () => {
    test('converts euros to cents correctly', () => {
      expect(eurosToCents('10.00')).toBe(1000);
      expect(eurosToCents('10,00')).toBe(1000);
      expect(eurosToCents('5.90')).toBe(590);
      expect(eurosToCents('5,90')).toBe(590);
    });
  });

  describe('formatEuros', () => {
    test('formats cents to euros string correctly', () => {
      expect(formatEuros(1000)).toBe('10.00€');
      expect(formatEuros(590)).toBe('5.90€');
      expect(formatEuros(99)).toBe('0.99€');
    });

    test('handles extreme coordinate values', () => {
      expect(() => validateCoordinates(90.1, 0)).toThrow('Invalid latitude');
      expect(() => validateCoordinates(0, 180.1)).toThrow('Invalid longitude');
    });

    test('handles special cases in euro formatting', () => {
      expect(formatEuros(0)).toBe('0.00€');
      expect(formatEuros(1)).toBe('0.01€');
      expect(formatEuros(999999)).toBe('9999.99€');
    });
  });


  describe('parseCoordinates', () => {
    test('parses coordinate strings correctly', () => {
      expect(parseCoordinates('60.1699', '24.9384')).toEqual([60.1699, 24.9384]);
    });

    test('handles invalid coordinate strings', () => {
      expect(() => {
        parseCoordinates('invalid', '24.9384');
      }).toThrow('Invalid coordinates');
    });
  });

  describe('validateEuroString', () => {
    test('validates euro string format and digit limitations correctly', () => {
      // Valid formats
      expect(validateEuroString('10')).toBe(true);     // Whole numbers are valid
      expect(validateEuroString('10.00')).toBe(true);  // Two decimals with period
      expect(validateEuroString('10,00')).toBe(true);  // Two decimals with comma
      
      // Invalid formats
      expect(validateEuroString('10.0')).toBe(false);   // One decimal place
      expect(validateEuroString('10.000')).toBe(false); // Three decimal places
      expect(validateEuroString('abc')).toBe(false);    // Non-numeric
      expect(validateEuroString('')).toBe(false);       // Empty string
    });
  });

  describe('formatDistance', () => {
    test('formats distance correctly', () => {
      expect(formatDistance(500)).toBe('500m');
      expect(formatDistance(1000)).toBe('1000m');
    });
  });

  describe('calculateDistance', () => {
    test('calculates distance correctly', () => {
      const distance = calculateDistance(60.1699, 24.9384, 60.1699, 24.9384);
      expect(distance).toBe(0);

      const distance2 = calculateDistance(60.1699, 24.9384, 60.1701, 24.9386);
      expect(distance2).toBeGreaterThan(0);
    });
  });

  describe('validateCoordinates', () => {
    test('validates coordinate decimal places correctly', () => {
      expect(() => validateCoordinates(60.0578724813272, 24.9345733479616)).not.toThrow();
      expect(() => validateCoordinates(60.05787248132721, 24.9345733479616))
        .toThrow('Coordinates cannot have more than 13 decimal places');
      expect(() => validateCoordinates(60.0578724813272, 24.93457334796161))
        .toThrow('Coordinates cannot have more than 13 decimal places');
    });
  });

  describe('validateDeliveryDistance', () => {
    test('throws error when distance exceeds maximum', () => {
      const testRanges = [
        { min: 0, max: 1000, a: 100, b: 1, flag: null },
        { min: 2000, max: 0, a: 0, b: 0, flag: null }
      ];

      expect(() => validateDeliveryDistance(2500, testRanges))
        .toThrow('Delivery not available for this location');
    });
  });

  describe('validateCartValue', () => {
    test('validates cart value correctly', () => {
      // Should not throw for valid value
      expect(() => validateCartValue(1000)).not.toThrow();

      // Should throw for zero or negative values
      expect(() => validateCartValue(0))
        .toThrow('Cart value must be greater than 0');
      expect(() => validateCartValue(-100))
        .toThrow('Cart value must be greater than 0');
    });
  });

  describe('Integration Tests', () => {
    test('calculates complete delivery pricing correctly', () => {
      const distance = 600;
      const cartValue = 800;
      const minimumOrder = 1000;
      const basePrice = 199;

      const smallOrderSurcharge = minimumOrder - cartValue;
      const deliveryFee = calculateDeliveryFee(distance, basePrice, mockDistanceRanges);
      const totalPrice = cartValue + smallOrderSurcharge + deliveryFee;

      expect(totalPrice).toBe(1359); // 800 + 200 + (199 + 100 + 60)
    });
  });

  describe('validateInputs', () => {
    test('validates required fields', () => {
      const validInputs = {
        venueSlug: 'test-venue',
        cartValue: '10.00',
        userLatitude: '60.1699',
        userLongitude: '24.9384'
      };

      // Should not throw with valid inputs
      expect(() => validateInputs(validInputs)).not.toThrow();

      // Should throw with invalid cart value
      expect(() => validateInputs({
        ...validInputs,
        cartValue: 'invalid'
      })).toThrow('Invalid cart value format');

      // Should throw with invalid coordinates
      expect(() => validateInputs({
        ...validInputs,
        userLatitude: 'invalid'
      })).toThrow('Invalid coordinates format');
    });

    test('validates coordinate ranges', () => {
      const validInputs = {
        cartValue: '10.00',
        userLatitude: '60.1699',
        userLongitude: '24.9384',
        venueSlug: 'test-venue'
      };

      // Should throw for invalid latitude
      expect(() => validateInputs({
        ...validInputs,
        userLatitude: '91.0000'
      })).toThrow('Invalid latitude');

      // Should throw for invalid longitude
      expect(() => validateInputs({
        ...validInputs,
        userLongitude: '181.0000'
      })).toThrow('Invalid longitude');
    });

    test('validates empty coordinates', () => {
      const validInputs = {
        cartValue: '10.00',
        userLatitude: '',
        userLongitude: '24.9384',
        venueSlug: 'test-venue'
      };

      expect(() => validateInputs({
        ...validInputs
      })).toThrow('Invalid coordinates format');

      expect(() => validateInputs({
        ...validInputs,
        userLatitude: '60.1699',
        userLongitude: ''
      })).toThrow('Invalid coordinates format');
    });
  });
});