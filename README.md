# Delivery Order Price Calculator

A React TypeScript application that calculates delivery fees based on cart value, distance, and venue-specific pricing rules.

## 🚀 Features

- **Real-time Calculations**
  - Dynamic delivery fee calculation based on distance
  - Small order surcharge for orders below minimum value
  - Distance-based pricing with multiple ranges

- **Location Services**
  - Automatic geolocation support
  - Manual coordinate input
  - Distance calculation using Haversine formula

- **User Experience**
  - Real-time input validation
  - Detailed error messages
  - Loading states and animations
  - Responsive Wolt-themed design

- **Technical Features**
  - TypeScript for type safety
  - Comprehensive test coverage
  - Error boundary implementation
  - API integration with error handling

## 🛠️ Prerequisites

- Node.js (v14 or higher)
- npm (v6 or higher)

## Installation

Install dependencies:
- npm install

## Running the Application

To start the development server:
- npm start

The application will be available at `http://localhost:3000`

## Running Tests

To run the test suite:
- npm test


## Technical Details

### Technologies Used
- React 18
- TypeScript
- Jest for testing
- CSS for styling

### API Integration
The application integrates with two mock API endpoints:
- `getVenueStatic`: Retrieves venue location data
- `getVenueDynamic`: Retrieves venue-specific pricing rules

### Calculations
- Distance calculation using Haversine formula
- Delivery fee calculation based on distance ranges
- Small order surcharge for orders below minimum value

## Example Usage

1. Enter the venue slug (default: 'home-assignment-venue-helsinki')
2. Input cart value in EUR (10 €)
3. Either:
   - Enter latitude and longitude manually (latitude: 60.17094) - (longitude: 24.93087)
   - Use the "Get Location" button for automatic coordinates
4. Click "Calculate delivery price"
5. View the detailed price breakdown


## Contact

Ferdi Koçoglu - [ferdi_kocoglu@outlook.com]