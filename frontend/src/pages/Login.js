import React, { useState } from 'react';
import { Container, Form, Button, Card, Alert } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import { FaEnvelope, FaLock, FaSignInAlt } from 'react-icons/fa';
import config from '../config';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch(`${config.apiUrl}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          email: email.trim().toLowerCase(),
          password 
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Login failed');
      }

      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify({
        id: data.user.id,
        email: data.user.email,
        role: data.user.role
      }));

      // Navigate to the appropriate page
      if (data.user.role === 'admin') {
        navigate('/admin');
      } else {
        navigate('/home');
      }
    } catch (error) {
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (name === 'email') {
      setEmail(value);
    } else if (name === 'password') {
      setPassword(value);
    }
    // Clear error when user starts typing
    setError('');
  };

  return (
    <Container className="py-5">
      <Card className="mx-auto shadow-sm border-0" style={{ maxWidth: '400px' }}>
        <Card.Body className="p-4">
          <div className="text-center mb-4">
            <h2 className="h3">Welcome Back</h2>
            <p className="text-muted">Enter your credentials to continue</p>
          </div>

          {error && (
            <Alert variant="danger" dismissible onClose={() => setError('')}>
              {error}
            </Alert>
          )}

          <Form onSubmit={handleSubmit}>
            <Form.Group className="mb-3">
              <div className="position-relative">
                <FaEnvelope className="position-absolute text-primary" 
                  style={{ top: '12px', left: '15px' }} />
                <Form.Control
                  type="email"
                  name="email"
                  value={email}
                  onChange={handleInputChange}
                  placeholder="Enter your email"
                  required
                  className="ps-5"
                  autoComplete="email"
                />
              </div>
            </Form.Group>

            <Form.Group className="mb-4">
              <div className="position-relative">
                <FaLock className="position-absolute text-primary" 
                  style={{ top: '12px', left: '15px' }} />
                <Form.Control
                  type="password"
                  name="password"
                  value={password}
                  onChange={handleInputChange}
                  placeholder="Enter your password"
                  required
                  className="ps-5"
                  autoComplete="current-password"
                />
              </div>
            </Form.Group>

            <Button
              variant="primary"
              type="submit"
              className="w-100 mb-4"
              disabled={isLoading}
            >
              <FaSignInAlt className="me-2" />
              {isLoading ? 'Logging in...' : 'Log In'}
            </Button>

            <div className="text-center">
              <p className="mb-0 text-muted">
                Don't have an account?{' '}
                <Link to="/signup" className="text-decoration-none">
                  Sign up
                </Link>
              </p>
            </div>
          </Form>
        </Card.Body>
      </Card>
    </Container>
  );
}

export default Login;
