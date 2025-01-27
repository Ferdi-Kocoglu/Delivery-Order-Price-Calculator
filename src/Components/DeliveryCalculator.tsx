import React, { useState, useEffect } from 'react';
import { getVenueStatic, getVenueDynamic } from '../Services/api';
import { calculateDistance, calculateDeliveryFee, validateCoordinates, validateEuroString, eurosToCents } from '../Utils/calculations';
import '../Styles/DeliveryCalculator.css';

interface DeliveryCalculation {
  cartValue: number;
  deliveryFee: number;
  smallOrderSurcharge: number;
  totalPrice: number;
  distance: number;
}

export const DeliveryCalculator: React.FC = () => {
  const [formData, setFormData] = useState({
    venueSlug: 'home-assignment-venue-helsinki',
    cartValue: '',
    userLatitude: '',
    userLongitude: ''
  });
  const [calculationResult, setCalculationResult] = useState<DeliveryCalculation | null>(null);
  const [outOfRange, setOutOfRange] = useState(false);
  const [isCalculating, setIsCalculating] = useState(false);
  const [inputsChanged, setInputsChanged] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string>();
  const [validationErrors, setValidationErrors] = useState<Set<string>>(new Set());
  const [isGettingLocation, setIsGettingLocation] = useState(false);

  useEffect(() => {
    console.log('isCalculating:', isCalculating); // Debug log
  }, [isCalculating]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isCalculating || !inputsChanged) return;
    
    setErrorMessage('');
    setOutOfRange(false);
    setIsCalculating(true);

    // Clear all previous validation errors
    setValidationErrors(new Set());

    // Validate all fields
    let hasErrors = false;
    if (!formData.venueSlug.trim()) {
      setValidationErrors(prev => new Set(prev).add('venueSlug'));
      hasErrors = true;
    }
    if (!formData.cartValue || !validateEuroString(formData.cartValue)) {
      setValidationErrors(prev => new Set(prev).add('cartValue'));
      hasErrors = true;
    }
    if (!formData.userLatitude) {
      setValidationErrors(prev => new Set(prev).add('userLatitude'));
      hasErrors = true;
    }
    if (!formData.userLongitude) {
      setValidationErrors(prev => new Set(prev).add('userLongitude'));
      hasErrors = true;
    }

    if (hasErrors) {
      setIsCalculating(false);
      return;
    }

    try {
      const venueStatic = await getVenueStatic(formData.venueSlug);
      const venueDynamic = await getVenueDynamic(formData.venueSlug);

      validateCoordinates(parseFloat(formData.userLatitude),
      parseFloat(formData.userLongitude));

      const distance = calculateDistance(
        parseFloat(formData.userLatitude),
        parseFloat(formData.userLongitude),
        venueStatic.venue_raw.location.coordinates[1],
        venueStatic.venue_raw.location.coordinates[0]
      );

      if (distance > 2000) {
        setOutOfRange(true);
        setCalculationResult({
          cartValue: Math.round(parseFloat(formData.cartValue) * 100),
          deliveryFee: 0,
          distance: distance,
          smallOrderSurcharge: 0,
          totalPrice: 0
        });
        setIsCalculating(false);
        return;
      }

      const deliverySpecs = venueDynamic.venue_raw.delivery_specs;
      const cartValueInCents = eurosToCents(formData.cartValue);
      
      // Calculate small order surcharge
      const smallOrderSurcharge = Math.max(
        0,
        deliverySpecs.order_minimum_no_surcharge - cartValueInCents
      );

      // Calculate delivery fee
      const deliveryFee = calculateDeliveryFee(
        distance,
        deliverySpecs.delivery_pricing.base_price,
        deliverySpecs.delivery_pricing.distance_ranges
      );

      // If deliveryFee is null, delivery is not possible
      if (deliveryFee === null) {
        setOutOfRange(true);
        setCalculationResult({
          cartValue: cartValueInCents,
          deliveryFee: 0,
          distance: distance,
          smallOrderSurcharge: 0,
          totalPrice: 0
        });
        setIsCalculating(false);
        return;
      }

      // Calculate total
      const totalPrice = cartValueInCents + smallOrderSurcharge + deliveryFee;

      setCalculationResult({
        cartValue: cartValueInCents,
        deliveryFee,
        distance,
        smallOrderSurcharge,
        totalPrice
      });
      
      setInputsChanged(false); // Reset the changed state after successful calculation
    } catch (error) {
      let e;
      if (typeof error === "string") {
        e = error.toUpperCase();
      } else if (error instanceof Error) {
        e = error.message;
      }
      setErrorMessage(e);
    } finally {
      setIsCalculating(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setInputsChanged(true);
    setCalculationResult(null); // Clear results when inputs change
    
    // Clear error for this field if it becomes valid
    if (name === 'cartValue' && value && parseFloat(value) >= 0) {
      setValidationErrors(prev => {
        const newErrors = new Set(prev);
        newErrors.delete('cartValue');
        return newErrors;
      });
    } else if (value) {
      setValidationErrors(prev => {
        const newErrors = new Set(prev);
        newErrors.delete(name);
        return newErrors;
      });
    }
  };

  const handleGetLocation = () => {
    if (!navigator?.geolocation) {
      setErrorMessage('Geolocation is not supported by your browser');
      return;
    }

    setIsGettingLocation(true);
    setErrorMessage(''); // Clear any existing error messages

    try {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setFormData(prev => ({
            ...prev,
            userLatitude: position.coords.latitude.toFixed(4),
            userLongitude: position.coords.longitude.toFixed(4)
          }));
          setInputsChanged(true);
          setIsGettingLocation(false);
          setErrorMessage(''); // Clear any existing error messages on success
        },
        (error) => {
          setIsGettingLocation(false);
          let errorMessage = 'Failed to get location';
          
          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMessage = 'Please enable location permissions in your browser settings';
              break;
            case error.POSITION_UNAVAILABLE:
              errorMessage = 'Location information is unavailable';
              break;
            case error.TIMEOUT:
              errorMessage = 'Location request timed out';
              break;
            default:
              errorMessage = 'An unknown error occurred while getting location';
          }
          
          setErrorMessage(errorMessage);
        },
        {
          timeout: 10000,
          maximumAge: 0,
          enableHighAccuracy: false // Changed to false for better Firefox compatibility
        }
      );
    } catch (error) {
      setIsGettingLocation(false);
      setErrorMessage('Failed to access location services. Please try again or enter coordinates manually.');
    }
  };

  const getErrorMessage = (fieldName: string): string => {
    switch (fieldName) {
      case 'cartValue':
        return "Please enter a valid cart value";
      case 'userLatitude':
        return "Please enter a valid latitude";
      case 'userLongitude':
        return "Please enter a valid longitude";
      case 'venueSlug':
        return "Please enter a valid venue slug";
      default:
        return "Please fill out this field";
    }
  };

  const getButtonText = () => {
    if (isCalculating) return 'Calculating...';
    if (!inputsChanged) return 'Calculated';
    return 'Calculate delivery price';
  };

  const formatCurrency = (cents: number): string => {
    return `${(cents / 100).toFixed(2).replace('.', ',')} EUR`;
  };

  return (
    <div className="delivery-calculator">
      <h1>Delivery Order Price Calculator</h1>
      
      <h2>Details</h2>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Venue slug</label>
          <input
            data-test-id="venueSlug"
            name="venueSlug"
            value={formData.venueSlug}
            onChange={handleInputChange}
            className={`fancy-input ${validationErrors.has('venueSlug') ? 'error' : ''}`}
          />
          {validationErrors.has('venueSlug') && (
            <div className="error-message">
              <span className="error-icon">⚠️</span>
              {getErrorMessage('venueSlug')}
            </div>
          )}
        </div>

        <div className="form-group">
          <label>Cart value (EUR)</label>
          <input
            className={`fancy-input ${validationErrors.has('cartValue') ? 'error' : ''}`}
            data-test-id="cartValue"
            name="cartValue"
            type="text"
            value={formData.cartValue}
            onChange={handleInputChange}
            placeholder="0,00"
          />
          {validationErrors.has('cartValue') && (
            <div className="error-message">
              <span className="error-icon">⚠️</span>
              {getErrorMessage('cartValue')}
            </div>
          )}
        </div>

        <div className="form-group">
          <label>User latitude</label>
          <input type='number'
            data-test-id="userLatitude"
            name="userLatitude"
            value={formData.userLatitude}
            onChange={handleInputChange}
            placeholder="60.17094"
            className={`fancy-input ${validationErrors.has('userLatitude') ? 'error' : ''}`}
          />
          {validationErrors.has('userLatitude') && (
            <div className="error-message">
              <span className="error-icon">⚠️</span>
              {getErrorMessage('userLatitude')}
            </div>
          )}
        </div>

        <div className="form-group">
          <label>User longitude</label>
          <input type='number'
            data-test-id="userLongitude"
            name="userLongitude"
            value={formData.userLongitude}
            onChange={handleInputChange}
            placeholder="24.93087"
            className={`fancy-input ${validationErrors.has('userLongitude') ? 'error' : ''}`}
          />
          {validationErrors.has('userLongitude') && (
            <div className="error-message">
              <span className="error-icon">⚠️</span>
              {getErrorMessage('userLongitude')}
            </div>
          )}
        </div>

        <div className="button-container">
          <button 
            type="button" 
            className="get-location fancy-button"
            data-test-id="getLocation"
            onClick={handleGetLocation}
            disabled={isCalculating}
          >
            {isGettingLocation ? 'Getting location...' : 'Get location'}
          </button>
          <button
            className={`calculate-button fancy-button ${isCalculating ? 'disabled' : ''}`}
            data-test-id="calculateDeliveryPrice"
            type="submit"
            disabled={isCalculating || !inputsChanged}
          >
            {getButtonText()}
          </button>
        </div>
      </form>

      {outOfRange && (
        <div className="error-message out-of-range">
          <span className="error-icon">⚠️</span>
          Delivery not available for this distance ({Math.round(calculationResult?.distance || 0)}m). Maximum delivery distance is 2000m.
        </div>
      )}

      {errorMessage && (
        <div className="error-message" data-test-id="error-message">
          <span className="error-icon">⚠️</span>
          {errorMessage}
        </div>
      )}
      
      {calculationResult && !outOfRange && !inputsChanged && calculationResult.deliveryFee > 0 && (
        <div className="calculation-results">
          <h2>Price breakdown</h2>
          <div className="result-item">
            <span>Cart Value</span>
            <span 
              data-test-id="cart-value"
              data-raw-value={calculationResult.cartValue}
            >
              {formatCurrency(calculationResult.cartValue)}
            </span>
          </div>
          <div className="result-item">
            <span>Delivery fee</span>
            <span 
              data-test-id="delivery-fee"
              data-raw-value={calculationResult.deliveryFee}
            >
              {formatCurrency(calculationResult.deliveryFee)}
            </span>
          </div>
          <div className="result-item distance">
            <span>Delivery distance</span>
            <span 
              data-test-id="delivery-distance"
              data-raw-value={calculationResult.distance}
            >
              {calculationResult.distance} m
            </span>
          </div>
          {calculationResult.smallOrderSurcharge > 0 && (
            <div className="result-item surcharge">
              <span>Small order surcharge</span>
              <span 
                data-test-id="small-order-surcharge"
                data-raw-value={calculationResult.smallOrderSurcharge}
              >
                {formatCurrency(calculationResult.smallOrderSurcharge)}
              </span>
            </div>
          )}
          <div className="result-item total">
            <span>Total price</span>
            <span 
              data-test-id="total-price"
              data-raw-value={calculationResult.totalPrice}
            >
              {formatCurrency(calculationResult.totalPrice)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};