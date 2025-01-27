import axios, { AxiosError } from 'axios';
import { VenueStatic, VenueDynamic } from '../Types/types';

const API_BASE_URL = 'https://consumer-api.development.dev.woltapi.com/home-assignment-api/v1/venues/';

const handleApiError = (error: unknown, endpoint: string): never => {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<{ message?: string }>;
    const status = axiosError.response?.status;
    const message = axiosError.response?.data?.message || axiosError.message;

    switch (status) {
      case 404:
        throw new Error(`Failed to fetch ${endpoint}: ${message}`);
      case 429:
        throw new Error(`Failed to fetch ${endpoint}: ${message}`);
      case 500:
        throw new Error(`Failed to fetch ${endpoint}: ${message}`);
      default:
        throw new Error(`Failed to fetch ${endpoint}: ${message}`);
    }
  }
  throw new Error(`Failed to fetch ${endpoint}`);
};

export const getVenueStatic = async (venueId: string): Promise<VenueStatic> => {
  try {
    console.log('Fetching static data for venue:', venueId);
    const response = await axios.get(`${API_BASE_URL}${venueId}/static`);
    console.log('Static API response:', response.data);
    return response.data;
  } catch (error) {
    return handleApiError(error, 'venue static data');
  }
};

export const getVenueDynamic = async (venueId: string): Promise<VenueDynamic> => {
  try {
    console.log('Fetching dynamic data for venue:', venueId);
    const response = await axios.get(`${API_BASE_URL}${venueId}/dynamic`);
    console.log('Dynamic API response:', response.data);
    return response.data;
  } catch (error) {
    return handleApiError(error, 'venue dynamic data');
  }
};