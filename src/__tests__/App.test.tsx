import React from 'react';
import { render, screen, configure } from '@testing-library/react';
import App from '../App';

// Configure Testing Library to use data-test-id
configure({ testIdAttribute: 'data-test-id' });

describe('App', () => {
  test('renders DeliveryCalculator component', () => {
    render(<App />);
    
    // Check if the main calculator elements are present
    expect(screen.getByTestId('cartValue')).toBeInTheDocument();
    expect(screen.getByTestId('userLatitude')).toBeInTheDocument();
    expect(screen.getByTestId('userLongitude')).toBeInTheDocument();
    expect(screen.getByTestId('calculateDeliveryPrice')).toBeInTheDocument();
  });

  test('renders with ErrorBoundary wrapper', () => {
    const { container } = render(<App />);
    expect(container.firstChild).toHaveClass('delivery-calculator');
  });
}); 