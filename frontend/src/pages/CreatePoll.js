import React, { useState } from 'react';
import { Container, Card, Form, Button, Alert } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';

function CreatePoll() {
  const [pollData, setPollData] = useState({
    question: '',
    options: ['', ''],
    endDate: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleOptionChange = (index, value) => {
    const newOptions = [...pollData.options];
    newOptions[index] = value;
    setPollData({ ...pollData, options: newOptions });
  };

  const addOption = () => {
    if (pollData.options.length < 5) {
      setPollData({ ...pollData, options: [...pollData.options, ''] });
    }
  };

  const removeOption = (index) => {
    if (pollData.options.length > 2) {
      const newOptions = pollData.options.filter((_, i) => i !== index);
      setPollData({ ...pollData, options: newOptions });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Validate inputs
    if (!pollData.question.trim()) {
      setError('Please enter a question');
      setLoading(false);
      return;
    }

    if (pollData.options.some(opt => !opt.trim())) {
      setError('All options must be filled');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('http://localhost:3001/api/polls', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          question: pollData.question,
          options: pollData.options,
          endDate: pollData.endDate
        })
      });

      if (!response.ok) {
        throw new Error('Failed to create poll');
      }

      navigate('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container className="py-5">
      <Card className="mx-auto" style={{ maxWidth: '600px' }}>
        <Card.Body>
          <Card.Title className="mb-4">Create New Poll</Card.Title>
          
          {error && (
            <Alert variant="danger" className="mb-4">
              {error}
            </Alert>
          )}

          <Form onSubmit={handleSubmit}>
            <Form.Group className="mb-4">
              <Form.Label>Question</Form.Label>
              <Form.Control
                type="text"
                value={pollData.question}
                onChange={(e) => setPollData({ ...pollData, question: e.target.value })}
                placeholder="Enter your question"
                required
              />
            </Form.Group>

            {pollData.options.map((option, index) => (
              <Form.Group key={index} className="mb-3">
                <div className="d-flex gap-2">
                  <Form.Control
                    type="text"
                    value={option}
                    onChange={(e) => handleOptionChange(index, e.target.value)}
                    placeholder={`Option ${index + 1}`}
                    required
                  />
                  {pollData.options.length > 2 && (
                    <Button 
                      variant="outline-danger"
                      onClick={() => removeOption(index)}
                      className="flex-shrink-0"
                    >
                      Remove
                    </Button>
                  )}
                </div>
              </Form.Group>
            ))}

            {pollData.options.length < 5 && (
              <Button 
                variant="outline-secondary" 
                onClick={addOption}
                className="mb-4"
              >
                Add Option
              </Button>
            )}

            <Form.Group className="mb-4">
              <Form.Label>End Date (Optional)</Form.Label>
              <Form.Control
                type="datetime-local"
                value={pollData.endDate}
                onChange={(e) => setPollData({ ...pollData, endDate: e.target.value })}
                min={new Date().toISOString().slice(0, 16)}
              />
            </Form.Group>

            <Button 
              type="submit" 
              variant="primary" 
              className="w-100"
              disabled={loading}
            >
              {loading ? 'Creating...' : 'Create Poll'}
            </Button>
          </Form>
        </Card.Body>
      </Card>
    </Container>
  );
}

export default CreatePoll;
