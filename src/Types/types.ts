export interface FormInputs {
  venueSlug: string;
  cartValue: string;
  userLatitude: string;
  userLongitude: string;
}

export interface DistanceRange {
  min: number;
  max: number;
  a: number;
  b: number;
  flag: null;
}

export interface DeliveryCalculation {
  cartValue: number;
  deliveryFee: number;
  smallOrderSurcharge: number;
  totalPrice: number;
  distance: number;
}

export interface VenueStatic {
  venue: {
    id: string;
    name: string;
    delivery_geo_range: {
      type: string;
      coordinates: number[][][];
    };
  };
  venue_raw: {
    location: {
      coordinates: [number, number];
    };
  };
}

export interface VenueDynamic {
  venue_raw: {
    delivery_specs: {
      delivery_pricing: {
        base_price: number;
        distance_ranges: DistanceRange[];
      };
      order_minimum_no_surcharge: number;
    };
  };
}