import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Table, Button, Alert, Badge } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';

function AdminDashboard() {
  const [users, setUsers] = useState([]);
  const [polls, setPolls] = useState([]);
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalPolls: 0,
    activePolls: 0,
    totalVotes: 0
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }

      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };

      const [usersRes, pollsRes, statsRes] = await Promise.all([
        fetch('http://localhost:3001/api/admin/users', { headers }),
        fetch('http://localhost:3001/api/admin/polls', { headers }),
        fetch('http://localhost:3001/api/admin/stats', { headers })
      ]);

      if (usersRes.status === 401 || pollsRes.status === 401 || statsRes.status === 401) {
        localStorage.removeItem('token');
        navigate('/login');
        return;
      }

      if (usersRes.status === 403 || pollsRes.status === 403 || statsRes.status === 403) {
        navigate('/');
        return;
      }

      if (!usersRes.ok || !pollsRes.ok || !statsRes.ok) {
        throw new Error('Failed to fetch data');
      }

      const [usersData, pollsData, statsData] = await Promise.all([
        usersRes.json(),
        pollsRes.json(),
        statsRes.json()
      ]);

      setUsers(usersData);
      setPolls(pollsData);
      setStats(statsData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (userId) => {
    try {
      const response = await fetch(`http://localhost:3001/api/admin/users/${userId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.status === 401) {
        localStorage.removeItem('token');
        navigate('/login');
        return;
      }

      if (response.status === 403) {
        navigate('/');
        return;
      }

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete user');
      }

      fetchData();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleClosePoll = async (pollId) => {
    try {
      const response = await fetch(`http://localhost:3001/api/polls/${pollId}/close`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.status === 401) {
        localStorage.removeItem('token');
        navigate('/login');
        return;
      }

      if (response.status === 403) {
        navigate('/');
        return;
      }

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to close poll');
      }

      fetchData();
    } catch (err) {
      setError(err.message);
    }
  };

  if (loading) {
    return (
      <Container className="py-5">
        <div className="text-center">Loading dashboard...</div>
      </Container>
    );
  }

  return (
    <Container className="py-5">
      {error && (
        <Alert variant="danger" onClose={() => setError('')} dismissible>
          {error}
        </Alert>
      )}

      <Row className="mb-4">
        <Col md={3}>
          <Card className="h-100 border-0 shadow-sm">
            <Card.Body className="text-center">
              <h3 className="mb-0">{stats.totalUsers}</h3>
              <Card.Text className="text-muted">Total Users</Card.Text>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="h-100 border-0 shadow-sm">
            <Card.Body className="text-center">
              <h3 className="mb-0">{stats.totalPolls}</h3>
              <Card.Text className="text-muted">Total Polls</Card.Text>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="h-100 border-0 shadow-sm">
            <Card.Body className="text-center">
              <h3 className="mb-0">{stats.activePolls}</h3>
              <Card.Text className="text-muted">Active Polls</Card.Text>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="h-100 border-0 shadow-sm">
            <Card.Body className="text-center">
              <h3 className="mb-0">{stats.totalVotes}</h3>
              <Card.Text className="text-muted">Total Votes</Card.Text>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Row className="mb-4">
        <Col>
          <Card className="border-0 shadow-sm">
            <Card.Header className="bg-transparent border-0">
              <h5 className="mb-0">Users</h5>
            </Card.Header>
            <Card.Body>
              <div className="table-responsive">
                <Table hover className="align-middle mb-0">
                  <thead className="bg-light">
                    <tr>
                      <th>Email</th>
                      <th>Role</th>
                      <th>Created At</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map(user => (
                      <tr key={user._id}>
                        <td>{user.email}</td>
                        <td>
                          <Badge bg={user.role === 'admin' ? 'primary' : 'secondary'}>
                            {user.role}
                          </Badge>
                        </td>
                        <td>{new Date(user.createdAt).toLocaleDateString()}</td>
                        <td>
                          {user.role !== 'admin' && (
                            <Button
                              variant="outline-danger"
                              size="sm"
                              onClick={() => handleDeleteUser(user._id)}
                            >
                              Delete
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Row>
        <Col>
          <Card className="border-0 shadow-sm">
            <Card.Header className="bg-transparent border-0">
              <h5 className="mb-0">Polls</h5>
            </Card.Header>
            <Card.Body>
              <div className="table-responsive">
                <Table hover className="align-middle mb-0">
                  <thead className="bg-light">
                    <tr>
                      <th>Question</th>
                      <th>Creator</th>
                      <th>Status</th>
                      <th>Votes</th>
                      <th>Created At</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {polls.map(poll => (
                      <tr key={poll._id}>
                        <td>{poll.question}</td>
                        <td>{poll.creator}</td>
                        <td>
                          <Badge bg={poll.active ? 'success' : 'secondary'}>
                            {poll.active ? 'Active' : 'Closed'}
                          </Badge>
                        </td>
                        <td>{poll.totalVotes}</td>
                        <td>{new Date(poll.createdAt).toLocaleDateString()}</td>
                        <td>
                          {poll.active && (
                            <Button
                              variant="outline-warning"
                              size="sm"
                              onClick={() => handleClosePoll(poll._id)}
                            >
                              Close
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
}

export default AdminDashboard;
