import React from 'react';
import { render, screen, fireEvent, waitFor, configure, act } from '@testing-library/react';
import { DeliveryCalculator } from '../Components/DeliveryCalculator';
import { getVenueStatic, getVenueDynamic } from '../Services/api';
import * as api from '../Services/api';

// Configure Testing Library to use data-test-id instead of data-testid
configure({ testIdAttribute: 'data-test-id' });

// Mock the API calls
jest.mock('../Services/api');
const mockGetVenueStatic = getVenueStatic as jest.MockedFunction<typeof getVenueStatic>;
const mockGetVenueDynamic = getVenueDynamic as jest.MockedFunction<typeof getVenueDynamic>;

describe('DeliveryCalculator', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    // Setup mock API responses
    mockGetVenueStatic.mockResolvedValue({
      venue: {
        id: 'test-id',
        name: 'Test Venue',
        delivery_geo_range: {
          type: 'Polygon',
          coordinates: [[[0, 0]]]
        }
      },
      venue_raw: {
        location: {
          coordinates: [24.9384, 60.1699] // [longitude, latitude]
        }
      }
    });

    mockGetVenueDynamic.mockResolvedValue({
      venue_raw: {
        delivery_specs: {
          order_minimum_no_surcharge: 1000,
          delivery_pricing: {
            base_price: 190,
            distance_ranges: [
              { min: 0, max: 1000, a: 100, b: 1, flag: null },
              { min: 1000, max: 2000, a: 200, b: 2, flag: null },
              { min: 2000, max: 0, a: 0, b: 0, flag: null }
            ]
          }
        }
      }
    });
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  test('renders all input fields with correct test IDs', () => {
    render(<DeliveryCalculator />);
    
    expect(screen.getByTestId('venueSlug')).toBeInTheDocument();
    expect(screen.getByTestId('cartValue')).toBeInTheDocument();
    expect(screen.getByTestId('userLatitude')).toBeInTheDocument();
    expect(screen.getByTestId('userLongitude')).toBeInTheDocument();
    expect(screen.getByTestId('calculateDeliveryPrice')).toBeInTheDocument();
    expect(screen.getByTestId('getLocation')).toBeInTheDocument();
  });

  test('calculates delivery price and displays results with correct raw values', async () => {
    render(<DeliveryCalculator />);

    fireEvent.change(screen.getByTestId('cartValue'), { target: { value: '10.00' } });
    fireEvent.change(screen.getByTestId('userLatitude'), { target: { value: '60.1699' } });
    fireEvent.change(screen.getByTestId('userLongitude'), { target: { value: '24.9384' } });
    
    await act(async () => {
      fireEvent.click(screen.getByTestId('calculateDeliveryPrice'));
    });

    await waitFor(() => {
      const cartValueElement = screen.getByTestId('cart-value');
      const deliveryFeeElement = screen.getByTestId('delivery-fee');
      const distanceElement = screen.getByTestId('delivery-distance');
      const totalElement = screen.getByTestId('total-price');

      expect(cartValueElement.getAttribute('data-raw-value')).toBe('1000');
      expect(deliveryFeeElement.getAttribute('data-raw-value')).toBe('290');
      expect(distanceElement.getAttribute('data-raw-value')).toBe('0');
      expect(totalElement.getAttribute('data-raw-value')).toBe('1290');
    });
  });

  test('displays error message when API call fails', async () => {
    // Mock the API to throw an error
    jest.spyOn(api, 'getVenueStatic').mockRejectedValueOnce(new Error('API Error'));

    render(<DeliveryCalculator />);

    await act(async () => {
      fireEvent.change(screen.getByTestId('cartValue'), { target: { value: '10.00' } });
      fireEvent.change(screen.getByTestId('userLatitude'), { target: { value: '60.1699' } });
      fireEvent.change(screen.getByTestId('userLongitude'), { target: { value: '24.9384' } });
      fireEvent.click(screen.getByTestId('calculateDeliveryPrice'));
    });

    await waitFor(() => {
      const errorMessage = screen.getByTestId('error-message');
      expect(errorMessage).toBeInTheDocument();
      expect(errorMessage).toHaveTextContent('API Error');
    });

    // Clean up mock
    jest.restoreAllMocks();
  });

  test('handles geolocation button click', async () => {
    const mockGeolocation = {
      getCurrentPosition: jest.fn().mockImplementationOnce((success) => 
        success({
          coords: {
            latitude: 60.1699,
            longitude: 24.9384
          }
        })
      )
    };
    
    // @ts-ignore
    global.navigator.geolocation = mockGeolocation;
    
    render(<DeliveryCalculator />);
    
    fireEvent.click(screen.getByTestId('getLocation'));
    
    await waitFor(() => {
      expect(screen.getByTestId('userLatitude')).toHaveValue(60.1699);
      expect(screen.getByTestId('userLongitude')).toHaveValue(24.9384);
    });
  });

  test('handles concurrent API calls', async () => {
    render(<DeliveryCalculator />);
    
    fireEvent.change(screen.getByTestId('cartValue'), { target: { value: '10.00' } });
    fireEvent.change(screen.getByTestId('userLatitude'), { target: { value: '60.1699' } });
    fireEvent.change(screen.getByTestId('userLongitude'), { target: { value: '24.9384' } });
    
    // Mock API to return a delayed response
    jest.spyOn(api, 'getVenueStatic').mockImplementation(() => 
      new Promise(resolve => setTimeout(() => resolve({ 
        venue: {
          id: 'test-id',
          name: 'Test Venue',
          delivery_geo_range: {
            type: 'Polygon',
            coordinates: [[[24.9384, 60.1699]]]
          }
        },
        venue_raw: { location: { coordinates: [24.9384, 60.1699] } }
      }), 100))
    );
    
    await act(async () => {
      fireEvent.click(screen.getByTestId('calculateDeliveryPrice'));
    });

    // Check if button is disabled while calculation is in progress
    expect(screen.getByTestId('calculateDeliveryPrice')).toBeDisabled();
  });

  test('handles validation errors correctly', async () => {
    render(<DeliveryCalculator />);

    // Test invalid cart value
    fireEvent.change(screen.getByTestId('cartValue'), { 
      target: { value: '-10.00' } 
    });
    fireEvent.change(screen.getByTestId('userLatitude'), { 
      target: { value: '60.1699' } 
    });
    fireEvent.change(screen.getByTestId('userLongitude'), { 
      target: { value: '24.9384' } 
    });

    await act(async () => {
      fireEvent.click(screen.getByTestId('calculateDeliveryPrice'));
    });

    // Test out of range coordinates
    fireEvent.change(screen.getByTestId('cartValue'), { 
      target: { value: '10.00' } 
    });
    fireEvent.change(screen.getByTestId('userLatitude'), { 
      target: { value: '90.0000' } 
    });
    fireEvent.change(screen.getByTestId('userLongitude'), { 
      target: { value: '180.0000' } 
    });

    await act(async () => {
      fireEvent.click(screen.getByTestId('calculateDeliveryPrice'));
    });

    // Test delivery distance > 2000m
    mockGetVenueStatic.mockResolvedValueOnce({
      venue: {
        id: 'test-id',
        name: 'Test Venue',
        delivery_geo_range: {
          type: 'Polygon',
          coordinates: [[[25.0000, 61.0000]]]
        }
      },
      venue_raw: {
        location: {
          coordinates: [25.0000, 61.0000]
        }
      }
    });

    fireEvent.change(screen.getByTestId('userLatitude'), { 
      target: { value: '60.1699' } 
    });
    fireEvent.change(screen.getByTestId('userLongitude'), { 
      target: { value: '24.9384' } 
    });

    await act(async () => {
      fireEvent.click(screen.getByTestId('calculateDeliveryPrice'));
    });

    await waitFor(() => {
      const errorMessage = screen.getByText(/Delivery not available for this distance/);
      expect(errorMessage).toBeInTheDocument();
    });
  });

  test('handles empty coordinate validation', async () => {
    render(<DeliveryCalculator />);

    // Test empty latitude
    fireEvent.change(screen.getByTestId('cartValue'), { 
      target: { value: '10.00' } 
    });
    fireEvent.change(screen.getByTestId('userLatitude'), { 
      target: { value: '' } 
    });
    fireEvent.change(screen.getByTestId('userLongitude'), { 
      target: { value: '24.9384' } 
    });

    await act(async () => {
      fireEvent.click(screen.getByTestId('calculateDeliveryPrice'));
    });

    await waitFor(() => {
      expect(screen.getByText('Please enter a valid latitude')).toBeInTheDocument();
    });

    // Test empty longitude
    fireEvent.change(screen.getByTestId('userLatitude'), { 
      target: { value: '60.1699' } 
    });
    fireEvent.change(screen.getByTestId('userLongitude'), { 
      target: { value: '' } 
    });

    await act(async () => {
      fireEvent.click(screen.getByTestId('calculateDeliveryPrice'));
    });

    await waitFor(() => {
      expect(screen.getByText('Please enter a valid longitude')).toBeInTheDocument();
    });
  });

  test('handles null delivery fee case', async () => {
    mockGetVenueDynamic.mockResolvedValueOnce({
      venue_raw: {
        delivery_specs: {
          order_minimum_no_surcharge: 1000,
          delivery_pricing: {
            base_price: 190,
            distance_ranges: [
              { min: 0, max: 0, a: 0, b: 0, flag: null }  // This will cause null delivery fee
            ]
          }
        }
      }
    });

    render(<DeliveryCalculator />);

    fireEvent.change(screen.getByTestId('cartValue'), { target: { value: '10.00' } });
    fireEvent.change(screen.getByTestId('userLatitude'), { target: { value: '60.1699' } });
    fireEvent.change(screen.getByTestId('userLongitude'), { target: { value: '24.9384' } });

    await act(async () => {
      fireEvent.click(screen.getByTestId('calculateDeliveryPrice'));
    });

    await waitFor(() => {
      expect(screen.getByText(/Delivery not available for this distance/)).toBeInTheDocument();
    });
  });

  test('handles form validation edge cases', async () => {
    render(<DeliveryCalculator />);

    // Test invalid venue slug
    fireEvent.change(screen.getByTestId('venueSlug'), { target: { value: '' } });
    fireEvent.change(screen.getByTestId('cartValue'), { target: { value: '10.00' } });
    fireEvent.change(screen.getByTestId('userLatitude'), { target: { value: '60.1699' } });
    fireEvent.change(screen.getByTestId('userLongitude'), { target: { value: '24.9384' } });
    
    await act(async () => {
      fireEvent.click(screen.getByTestId('calculateDeliveryPrice'));
    });

    expect(screen.getByText(/Please enter a valid venue slug/)).toBeInTheDocument();

    // Test invalid cart value format
    fireEvent.change(screen.getByTestId('venueSlug'), { target: { value: 'test-venue' } });
    fireEvent.change(screen.getByTestId('cartValue'), { target: { value: '10.999' } });
    
    await act(async () => {
      fireEvent.click(screen.getByTestId('calculateDeliveryPrice'));
    });

    expect(screen.getByText(/Please enter a valid cart value/)).toBeInTheDocument();
  });

  test('formats currency with comma separator', async () => {
    render(<DeliveryCalculator />);

    fireEvent.change(screen.getByTestId('cartValue'), { target: { value: '10,00' } });
    fireEvent.change(screen.getByTestId('userLatitude'), { target: { value: '60.1699' } });
    fireEvent.change(screen.getByTestId('userLongitude'), { target: { value: '24.9384' } });
    
    await act(async () => {
      fireEvent.click(screen.getByTestId('calculateDeliveryPrice'));
    });

    await waitFor(() => {
      expect(screen.getByTestId('cart-value')).toHaveTextContent('10,00 EUR');
      expect(screen.getByTestId('delivery-fee')).toHaveTextContent('2,90 EUR');
      expect(screen.getByTestId('total-price')).toHaveTextContent('12,90 EUR');
    });
  });
});