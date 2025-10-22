// Simple React component test
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

// Mock component for testing
const TestComponent = () => {
  return <div>Test Component</div>;
};

describe('TestComponent', () => {
  it('renders without crashing', () => {
    render(<TestComponent />);
    expect(screen.getByText('Test Component')).toBeInTheDocument();
  });

  it('has correct text content', () => {
    render(<TestComponent />);
    const element = screen.getByText('Test Component');
    expect(element).toHaveTextContent('Test Component');
  });
});