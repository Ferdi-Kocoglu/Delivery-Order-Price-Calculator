import { getVenueStatic, getVenueDynamic } from '../Services/api';
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('API Services', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getVenueStatic', () => {
    test('successfully fetches static venue data', async () => {
      const mockData = {
        venue_raw: {
          location: {
            coordinates: [24.93287, 60.16994]
          }
        }
      };

      mockedAxios.get.mockResolvedValueOnce({ data: mockData });
      
      const result = await getVenueStatic('home-assignment-venue-helsinki');
      expect(result).toEqual(mockData);
    });

    test('handles network errors', async () => {
      mockedAxios.get.mockRejectedValueOnce({
        isAxiosError: true,
        response: undefined,
        message: 'Network Error'
      });
      
      await expect(getVenueStatic('test-venue'))
        .rejects
        .toThrow('Failed to fetch venue static data');
    });

    test('validates venue data structure', async () => {
      const invalidData = { venue_raw: { location: null } };
      mockedAxios.get.mockRejectedValueOnce({
        response: { 
          status: 400,
          data: { message: 'Invalid venue data format' }
        }
      });
      
      await expect(getVenueStatic('home-assignment-venue-helsinki'))
        .rejects.toThrow('Failed to fetch venue static data');
    });

    test('handles 404 response', async () => {
      mockedAxios.get.mockRejectedValueOnce({
        response: {
          status: 404,
          data: { message: 'Venue not found' }
        }
      });
      
      await expect(getVenueStatic('home-assignment-venue-helsinki'))
        .rejects.toThrow('Failed to fetch venue static data');
    });

    test('handles timeout', async () => {
      mockedAxios.get.mockRejectedValueOnce({
        code: 'ECONNABORTED',
        message: 'timeout of 5000ms exceeded'
      });
      
      await expect(getVenueStatic('home-assignment-venue-helsinki'))
        .rejects.toThrow('Failed to fetch venue static data');
    });

    test('handles API response validation errors', async () => {
      // Mock fetch with invalid response structure
      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        json: () => Promise.resolve({
          error: 'Invalid venue data structure'
        })
      });

      await expect(getVenueStatic('test-venue')).rejects.toThrow('Failed to fetch venue static data');

      // Test missing delivery specs
      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        json: () => Promise.resolve({
          error: 'Invalid delivery specifications'
        })
      });

      await expect(getVenueDynamic('test-venue')).rejects.toThrow('Failed to fetch venue dynamic data');
    });

    test('handles malformed API responses', async () => {
      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          venue_raw: {}
        })
      });

      await expect(getVenueStatic('test-venue')).rejects.toThrow('Failed to fetch venue static data');
    });
  });

  describe('getVenueDynamic', () => {
    test('successfully fetches dynamic venue data', async () => {
      const mockData = {
        venue_raw: {
          delivery_specs: {
            order_minimum_no_surcharge: 1000,
            delivery_pricing: {
              base_price: 190,
              distance_ranges: [
                { min: 0, max: 500, a: 0, b: 2, flag: null }
              ]
            }
          }
        }
      };

      mockedAxios.get.mockResolvedValueOnce({ data: mockData });
      
      const result = await getVenueDynamic('home-assignment-venue-helsinki');
      expect(result).toEqual(mockData);
    });

    test('validates delivery specifications', async () => {
      const invalidData = { venue_raw: {} };
      mockedAxios.get.mockRejectedValueOnce({
        response: {
          status: 400,
          data: { message: 'Invalid delivery specifications' }
        }
      });
      
      await expect(getVenueDynamic('home-assignment-venue-helsinki'))
        .rejects.toThrow('Failed to fetch venue dynamic data');
    });

    test('handles rate limiting', async () => {
      mockedAxios.get.mockRejectedValueOnce({
        response: {
          status: 429,
          data: { message: 'Too many requests' }
        }
      });
      
      await expect(getVenueDynamic('home-assignment-venue-helsinki'))
        .rejects.toThrow('Failed to fetch venue dynamic data');
    });
  });

  describe('Integration Tests', () => {
    test('handles concurrent requests', async () => {
      const mockData = {
        venue_raw: {
          location: {
            coordinates: [24.93287, 60.16994]
          }
        }
      };

      mockedAxios.get.mockResolvedValue({ data: mockData });
      
      const results = await Promise.all([
        getVenueStatic('home-assignment-venue-helsinki'),
        getVenueStatic('home-assignment-venue-helsinki')
      ]);

      expect(results).toHaveLength(2);
      results.forEach(result => expect(result).toEqual(mockData));
    });

    test('handles request cancellation', async () => {
      mockedAxios.get.mockRejectedValueOnce({
        code: 'ECONNABORTED',
        message: 'Request cancelled'
      });
      
      await expect(getVenueStatic('home-assignment-venue-helsinki'))
        .rejects.toThrow('Failed to fetch venue static data');
    });
  });

  describe('error handling', () => {
    test('handles network timeout', async () => {
      mockedAxios.get.mockRejectedValueOnce({
        code: 'ECONNABORTED',
        message: 'timeout of 5000ms exceeded'
      });

      await expect(getVenueStatic('test-venue'))
        .rejects
        .toThrow('Failed to fetch venue static data');
    });

    test('handles rate limiting', async () => {
      mockedAxios.get.mockRejectedValueOnce({
        response: {
          status: 429,
          data: { message: 'Too Many Requests' }
        }
      });

      await expect(getVenueStatic('test-venue'))
        .rejects
        .toThrow('Failed to fetch venue static data');
    });

    test('handles server errors', async () => {
      mockedAxios.get.mockRejectedValueOnce({
        response: {
          status: 500,
          data: { message: 'Internal Server Error' }
        }
      });

      await expect(getVenueStatic('test-venue'))
        .rejects
        .toThrow('Failed to fetch venue static data');
    });
  });
});