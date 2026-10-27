export const environment = {
  production: false,
  apiUrl: (typeof window !== 'undefined' && window.location.port === '4200')
    ? 'http://localhost:3000/api'
    : '/api'
};
