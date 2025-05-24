import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import LoginPage from './LoginPage';

// Mock authService if LoginPage calls it directly on render (e.g. in a useEffect for checking auth status)
// For LoginPage, authService is primarily used in the handleSubmit, so not strictly needed for a basic render test.
// If we were testing the submit logic, we would mock it:
// vi.mock('../services/authService', () => ({
//   default: {
//     login: vi.fn(),
//     // ... other functions if needed
//   }
// }));

describe('LoginPage', () => {
  it('renders login form elements', () => {
    render(
      <BrowserRouter> {/* Required because LoginPage uses useNavigate */}
        <LoginPage />
      </BrowserRouter>
    );

    // Check for username input
    expect(screen.getByLabelText(/username/i)).toBeInTheDocument();
    
    // Check for password input
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    
    // Check for login button
    expect(screen.getByRole('button', { name: /login/i })).toBeInTheDocument();
  });

  // Add more tests later, e.g., for form submission, error handling, etc.
});
