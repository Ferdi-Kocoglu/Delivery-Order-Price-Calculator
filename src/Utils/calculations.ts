interface DistanceRange {
  min: number;
  max: number;
  a: number;
  b: number;
  flag: null;
  base?: number;  // Make base optional
}

interface FormInputs {
  cartValue: string;
  userLatitude: string;
  userLongitude: string;
}

/**
 * Calculates the straight-line distance between two points in meters
 */
export const calculateDistance = (
  userLat: number,
  userLon: number,
  venueLat: number,
  venueLon: number
): number => {
  const R = 6371000; // Earth's radius in meters
  const userLatRad = (userLat * Math.PI) / 180;
  const venueLatRad = (venueLat * Math.PI) / 180;
  const latDifference = ((venueLat - userLat) * Math.PI) / 180;
  const lonDifference = ((venueLon - userLon) * Math.PI) / 180;

  const a = Math.sin(latDifference / 2) * Math.sin(latDifference / 2) +
    Math.cos(userLatRad) *
    Math.cos(venueLatRad) *
    Math.sin(lonDifference / 2) *
    Math.sin(lonDifference / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  return Math.round(distance);
};

/**
 * Converts euro string to cents
 * Example: "2.00" -> 200
 */
export const eurosToCents = (euros: string): number => {
  // Replace comma with period for decimal parsing
  const normalizedValue = euros.replace(',', '.');
  // Convert to float and multiply by 100 to get cents, ensuring decimal precision
  const floatValue = parseFloat(normalizedValue);
  const cents = Math.round(floatValue * 100);
  
  if (isNaN(cents)) {
    throw new Error('Invalid euro amount');
  }
  
  return cents;
};

/**
 * Formats cents to euro string with € symbol
 * Example: 200 -> "2.00€"
 */
export const formatEuros = (cents: number): string => {
  return `${(cents / 100).toFixed(2)}€`;
};

/**
 * Validates coordinates
 */
export const validateCoordinates = (latitude: number, longitude: number): void => {
  // Check if coordinates have more than 5 decimal places
  const latStr = latitude.toString();
  const lonStr = longitude.toString();
  const latDecimals = latStr.includes('.') ? latStr.split('.')[1].length : 0;
  const lonDecimals = lonStr.includes('.') ? lonStr.split('.')[1].length : 0;

  if (latDecimals > 13 || lonDecimals > 13) {
    throw new Error('Coordinates cannot have more than 13 decimal places');
  }

  if (latitude < -90 || latitude > 90) {
    throw new Error('Invalid latitude');
  }
  if (longitude < -180 || longitude > 180) {
    throw new Error('Invalid longitude');
  }
};

/**
 * Validates cart value
 */
export const validateCartValue = (value: number): void => {
  if (value <= 0) {
    throw new Error('Cart value must be greater than 0');
  }
};

/**
 * Calculates the delivery fee in cents based on distance and pricing rules
 * @param distance - Distance in meters
 * @param baseFee - Base fee in cents
 * @param distanceRanges - Array of distance ranges with pricing rules
 * @returns Delivery fee in cents
 */
export const calculateDeliveryFee = (distance: number, baseFee: number, distanceRanges: DistanceRange[]): number => {
  if (distance < 0) {
    throw new Error('Distance cannot be negative');
  }

  if (!distanceRanges.length || distanceRanges[0].min !== 0) {
    throw new Error('Invalid distance ranges configuration');
  }

  // Check for discontinuous ranges
  for (let i = 0; i < distanceRanges.length - 1; i++) {
    if (distanceRanges[i].max !== distanceRanges[i + 1].min) {
      throw new Error('No applicable distance range found');
    }
  }

  // Find the applicable range
  const range = distanceRanges.find(r => 
    distance >= r.min && (r.max === 0 ? false : distance < r.max)
  );

  if (!range) {
    throw new Error('Delivery not available for this distance');
  }

  const distanceComponent = Math.round((range.b * distance) / 10);
  const totalFee = baseFee + range.a + distanceComponent;

  return totalFee;
};

/**
 * Formats distance in meters
 * Example: 177 -> "177m"
 */
export const formatDistance = (meters: number): string => {
  return `${meters}m`;
};

/**
 * Calculates the total price in cents
 * All inputs should be in cents
 */
export const calculateTotal = (
  cartValueCents: number,
  deliveryFeeCents: number,
  smallOrderSurchargeCents: number
): number => {
  return cartValueCents + deliveryFeeCents + smallOrderSurchargeCents;
};

/**
 * Parses and validates coordinates
 * @throws Error if coordinates are invalid
 */
export const parseCoordinates = (lat: string, lon: string): [number, number] => {
  const latitude = parseFloat(lat);
  const longitude = parseFloat(lon);

  if (isNaN(latitude) || isNaN(longitude)) {
    throw new Error('Invalid coordinates format');
  }

  validateCoordinates(latitude, longitude);
  return [latitude, longitude];
};

/**
 * Validates that a value is a valid euro amount string
 * Example: "10.55"
 */
export const validateEuroString = (value: string): boolean => {
  // Accept whole numbers or numbers with exactly 2 decimal places
  const euroRegex = /^\d+([.,]\d{2})?$/;
  return euroRegex.test(value);
};

export type DeliveryCalculation = {
  cartValue: number;          // in cents
  deliveryFee: number;        // in cents
  distance: number;           // in meters
  smallOrderSurcharge: number; // in cents
  totalPrice: number;         // in cents
};

export interface DeliveryDistanceError extends Error {
  maxDistance: number;
  actualDistance: number;
}

export const validateDeliveryDistance = (
  distance: number,
  distanceRanges: DistanceRange[]
): void => {
  const maxRange = distanceRanges[distanceRanges.length - 1];
  if (maxRange.min > 0 && distance >= maxRange.min) {
    const error = new Error(
      `Delivery not available for this location (${Math.round(distance)}m). Maximum delivery distance is ${maxRange.min}m.`
    ) as DeliveryDistanceError;
    error.maxDistance = maxRange.min;
    error.actualDistance = distance;
    throw error;
  }
};

export const validateInputs = (inputs: FormInputs): void => {
  if (!validateEuroString(inputs.cartValue)) {
    throw new Error('Invalid cart value format. Please enter a valid amount (e.g., 10.00)');
  }

  const [lat, lon] = parseCoordinates(inputs.userLatitude, inputs.userLongitude);
  if (Math.abs(lat) > 90 || Math.abs(lon) > 180) {
    throw new Error('Invalid coordinates. Latitude must be between -90 and 90, longitude between -180 and 180');
  }
};