import React from 'react';
import '../styles/LoadingSpinner.css';

const LoadingSpinner = ({ isVisible = true }) => {
  if (!isVisible) return null;
  
  return (
    <div className="spinner-overlay">
      <div className="spinner-icon"></div>
    </div>
  );
};

export default LoadingSpinner;