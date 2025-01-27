import { DeliveryCalculator } from './Components/DeliveryCalculator';
import { ErrorBoundary } from './Components/ErrorBoundary';

function App() {
  return (
    <ErrorBoundary>
      <DeliveryCalculator />
    </ErrorBoundary>
  );
}

export default App;