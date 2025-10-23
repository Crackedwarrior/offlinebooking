// Simple test to verify Jest is working
describe('Basic Test Suite', () => {
  it('should pass a simple test', () => {
    expect(1 + 1).toBe(2);
  });

  it('should verify string operations', () => {
    const greeting = 'Hello';
    expect(greeting.toLowerCase()).toBe('hello');
  });

  it('should verify array operations', () => {
    const numbers = [1, 2, 3];
    expect(numbers.length).toBe(3);
    expect(numbers.includes(2)).toBe(true);
  });
});