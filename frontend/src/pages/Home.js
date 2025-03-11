import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Alert } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import Chat from '../components/Chat';

function Home() {
  const [polls, setPolls] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchPolls();
  }, []);

  const fetchPolls = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/polls', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch polls');
      }

      const data = await response.json();
      setPolls(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVote = async (pollId, optionIndex) => {
    try {
      const response = await fetch(`http://localhost:3001/api/polls/${pollId}/vote`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ optionIndex })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to vote');
      }

      fetchPolls(); // Refresh polls after voting
    } catch (err) {
      setError(err.message);
    }
  };

  const calculatePercentage = (votes, totalVotes) => {
    if (totalVotes === 0) return 0;
    return ((votes / totalVotes) * 100).toFixed(1);
  };

  if (loading) {
    return (
      <Container className="py-5">
        <div className="text-center">Loading polls...</div>
      </Container>
    );
  }

  return (
    <Container className="py-5">
      <Row>
        <Col md={8}>
          <div className="d-flex justify-content-between align-items-center mb-4">
            <h2>Active Polls</h2>
            <Button 
              variant="primary" 
              onClick={() => navigate('/create')}
            >
              Create Poll
            </Button>
          </div>

          {error && (
            <Alert variant="danger" className="mb-4">
              {error}
            </Alert>
          )}

          {polls.length === 0 ? (
            <Card className="text-center p-4">
              <Card.Text>No active polls available.</Card.Text>
            </Card>
          ) : (
            polls.map(poll => (
              <Card key={poll._id} className="mb-4">
                <Card.Body>
                  <Card.Title>{poll.question}</Card.Title>
                  <div className="mt-3">
                    {poll.options.map((option, index) => (
                      <div key={index} className="mb-3">
                        <div className="d-flex justify-content-between align-items-center mb-2">
                          <div>{option.text}</div>
                          <div>{calculatePercentage(option.votes, poll.totalVotes)}%</div>
                        </div>
                        <div className="position-relative">
                          <div
                            className="poll-option"
                            onClick={() => handleVote(poll._id, index)}
                            role="button"
                          >
                            <div
                              className="position-absolute h-100 bg-primary opacity-25"
                              style={{
                                width: `${calculatePercentage(option.votes, poll.totalVotes)}%`,
                                left: 0,
                                top: 0,
                                borderRadius: 'inherit'
                              }}
                            />
                            <span className="position-relative">
                              {option.votes} votes
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 text-muted">
                    <small>
                      Created by: {poll.creator}
                      {poll.endDate && ` • Ends: ${new Date(poll.endDate).toLocaleDateString()}`}
                    </small>
                  </div>
                </Card.Body>
              </Card>
            ))
          )}
        </Col>
        <Col md={4}>
          <Chat />
        </Col>
      </Row>
    </Container>
  );
}

export default Home;
