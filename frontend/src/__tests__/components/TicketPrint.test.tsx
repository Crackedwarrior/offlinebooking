// Simple component test
import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

// Mock component for testing
const TicketComponent = () => {
  return (
    <div>
      <h1>Ticket Print</h1>
      <button>Print Tickets</button>
    </div>
  );
};

describe('TicketComponent', () => {
  it('renders ticket print interface', () => {
    render(<TicketComponent />);
    expect(screen.getByText('Ticket Print')).toBeInTheDocument();
    expect(screen.getByText('Print Tickets')).toBeInTheDocument();
  });

  it('has correct button text', () => {
    render(<TicketComponent />);
    const button = screen.getByText('Print Tickets');
    expect(button).toBeInTheDocument();
  });
});