import React from 'react';
import { Navbar, Nav, Container, Button } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import { FaPoll, FaUserCircle, FaSignOutAlt, FaChartLine } from 'react-icons/fa';

function NavigationBar() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isAuthenticated = !!localStorage.getItem('token');
  const isAdmin = user.role === 'admin';

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/');
  };

  return (
    <Navbar expand="lg" variant="dark" className="navbar py-3 fixed-top">
      <Container>
        <Navbar.Brand as={Link} to={isAuthenticated ? '/home' : '/'} className="d-flex align-items-center">
          <FaPoll className="me-2" size={24} />
          <span className="neon-text">OpinionPulse</span>
        </Navbar.Brand>
        <Navbar.Toggle aria-controls="basic-navbar-nav" />
        <Navbar.Collapse id="basic-navbar-nav">
          <Nav className="ms-auto">
            {isAuthenticated ? (
              <>
                <Nav.Link as={Link} to="/create" className="me-3">
                  <Button variant="outline-primary" className="neon-border">
                    <FaPoll className="me-2" />
                    Create Poll
                  </Button>
                </Nav.Link>
                {isAdmin && (
                  <Nav.Link as={Link} to="/admin" className="me-3">
                    <Button variant="outline-info" className="neon-border">
                      <FaChartLine className="me-2" />
                      Admin
                    </Button>
                  </Nav.Link>
                )}
                <Button 
                  variant="outline-danger" 
                  onClick={handleLogout}
                  className="neon-border"
                >
                  <FaSignOutAlt className="me-2" />
                  Logout
                </Button>
              </>
            ) : (
              <>
                <Nav.Link as={Link} to="/" className="me-3">
                  <Button variant="outline-primary" className="neon-border">
                    <FaUserCircle className="me-2" />
                    Login
                  </Button>
                </Nav.Link>
                <Nav.Link as={Link} to="/signup">
                  <Button variant="primary" className="glow-effect">
                    Sign Up
                  </Button>
                </Nav.Link>
              </>
            )}
          </Nav>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
}

export default NavigationBar;
