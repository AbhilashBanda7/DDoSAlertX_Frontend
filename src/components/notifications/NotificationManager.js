import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

const Notification = ({ message, type, onClose }) => {
  const [isVisible, setIsVisible] = useState(true);

  // Configure icon and color based on type
  const getTypeConfig = () => {
    switch (type) {
      case 'success':
        return {
          bgColor: 'bg-green-600',
          icon: (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          )
        };
      case 'warning':
        return {
          bgColor: 'bg-yellow-600',
          icon: (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          )
        };
      case 'error':
        return {
          bgColor: 'bg-red-600',
          icon: (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          )
        };
      case 'info':
      default:
        return {
          bgColor: 'bg-blue-600',
          icon: (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          )
        };
    }
  };

  const { bgColor, icon } = getTypeConfig();

  // Close notification when clicked
  const handleClose = () => {
    setIsVisible(false);
    setTimeout(onClose, 300); // Give time for fade-out animation
  };

  // Auto-close after 5 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onClose, 300); // Give time for fade-out animation
    }, 5000);

    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div 
      className={`fixed flex items-center p-4 mb-4 text-white ${bgColor} rounded-lg shadow-lg transition-all duration-300 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'}`}
      style={{ zIndex: 1000, boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}
      role="alert"
    >
      <div className="inline-flex items-center justify-center flex-shrink-0 w-8 h-8 text-white">
        {icon}
      </div>
      <div className="ml-3 text-sm font-medium">{message}</div>
      <button 
        type="button" 
        onClick={handleClose}
        className="ml-auto -mx-1.5 -my-1.5 text-white rounded-lg p-1.5 inline-flex h-8 w-8 hover:bg-white hover:bg-opacity-20 focus:ring-2 focus:ring-white"
        aria-label="Close"
      >
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
          <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd"></path>
        </svg>
      </button>
    </div>
  );
};

const NotificationContainer = ({ notifications, removeNotification }) => {
  return createPortal(
    <div className="fixed top-4 right-4 flex flex-col gap-4 z-50 max-w-xs w-full">
      {notifications.map((notification) => (
        <Notification
          key={notification.id}
          message={notification.message}
          type={notification.type}
          onClose={() => removeNotification(notification.id)}
        />
      ))}
    </div>,
    document.body
  );
};

const NotificationManager = () => {
  const [notifications, setNotifications] = useState([]);

  const addNotification = (message, type = 'info') => {
    const id = Date.now(); // Simple unique ID
    setNotifications(prevNotifications => [
      ...prevNotifications,
      { id, message, type }
    ]);
    return id;
  };

  const removeNotification = (id) => {
    setNotifications(prevNotifications => 
      prevNotifications.filter(notification => notification.id !== id)
    );
  };

  // Listen for notification events
  useEffect(() => {
    const handlePlottingStarted = () => {
      addNotification('Plotting started', 'info');
    };
    
    const handlePlottingEnded = () => {
      addNotification('Plotting completed', 'success');
    };
    
    const handleAttackStarted = () => {
      addNotification('Attack detected!', 'error');
    };
    
    const handleAttackEnded = () => {
      addNotification('Attack ended', 'warning');
    };
    
    const handleEWSAlert = (event) => {
      const ewsNumber = event.detail?.ewsNumber || '';
      addNotification(`EWS ${ewsNumber} Alert detected`, 'warning');
    };

    // Register event listeners
    document.addEventListener('plottingStarted', handlePlottingStarted);
    document.addEventListener('plottingEnded', handlePlottingEnded);
    document.addEventListener('attackDetected', handleAttackStarted);
    document.addEventListener('attackEnded', handleAttackEnded);
    document.addEventListener('ewsAlertDetected', handleEWSAlert);

    return () => {
      // Cleanup
      document.removeEventListener('plottingStarted', handlePlottingStarted);
      document.removeEventListener('plottingEnded', handlePlottingEnded);
      document.removeEventListener('attackDetected', handleAttackStarted);
      document.removeEventListener('attackEnded', handleAttackEnded);
      document.removeEventListener('ewsAlertDetected', handleEWSAlert);
    };
  }, []);

  return (
    <NotificationContainer
      notifications={notifications}
      removeNotification={removeNotification}
    />
  );
};

export default NotificationManager; 