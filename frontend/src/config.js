// Network configuration
const getApiUrl = () => {
  // In development, you can set this to your network IP
  // For example: return 'http://192.168.1.100:3001';
  return process.env.REACT_APP_API_URL || 'http://localhost:3001';
};

const config = {
  apiUrl: getApiUrl(),
  socketUrl: getApiUrl(), // Socket.IO will use the same URL
};

export default config;
