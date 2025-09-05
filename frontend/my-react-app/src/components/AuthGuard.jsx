import React, { useState, useEffect } from 'react';
import { AUTH_CONFIG } from '../config/authConfig';

const AuthGuard = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Check if user is already authenticated on component mount
  useEffect(() => {
    if (AUTH_CONFIG.REMEMBER_AUTH) {
      const authStatus = localStorage.getItem('campaignMigrationAuth');
      const authTimestamp = localStorage.getItem('campaignMigrationAuthTime');
      
      if (authStatus === 'authenticated' && authTimestamp) {
        const now = new Date().getTime();
        const authTime = parseInt(authTimestamp);
        
        // Check if session is still valid
        if (now - authTime < AUTH_CONFIG.SESSION_DURATION) {
          setIsAuthenticated(true);
        } else {
          // Session expired, clear storage
          localStorage.removeItem('campaignMigrationAuth');
          localStorage.removeItem('campaignMigrationAuthTime');
        }
      }
    }
  }, []);

  // Validate password function
  const validatePassword = (inputPassword) => {
    // Support for multiple passwords if configured
    if (AUTH_CONFIG.MULTIPLE_PASSWORDS && Array.isArray(AUTH_CONFIG.MULTIPLE_PASSWORDS)) {
      return AUTH_CONFIG.MULTIPLE_PASSWORDS.includes(inputPassword);
    }
    // Default single password
    return inputPassword === AUTH_CONFIG.PASSWORD;
  };

  const handleLogin = (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Simulate a small delay for better UX
    setTimeout(() => {
      if (validatePassword(password)) {
        setIsAuthenticated(true);
        if (AUTH_CONFIG.REMEMBER_AUTH) {
          localStorage.setItem('campaignMigrationAuth', 'authenticated');
          localStorage.setItem('campaignMigrationAuthTime', new Date().getTime().toString());
        }
        setError('');
      } else {
        setError('Invalid password. Please try again.');
      }
      setLoading(false);
    }, 500);
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem('campaignMigrationAuth');
    localStorage.removeItem('campaignMigrationAuthTime');
    setPassword('');
  };

  // If not authenticated, show login form
  if (!isAuthenticated) {
    return (
      <>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
          
          .auth-guard-container {
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            background: linear-gradient(135deg, #001C38 0%, #00C4D6 100%);
            background-attachment: fixed;
            padding: 20px;
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            position: relative;
            overflow: hidden;
          }

          .auth-guard-container::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: linear-gradient(45deg, rgba(0, 196, 214, 0.1) 0%, rgba(37, 99, 235, 0.1) 100%);
            backdrop-filter: blur(10px);
          }

          .auth-guard-card {
            background: #FFFFFF;
            border-radius: 20px;
            padding: 48px;
            box-shadow: 0 32px 64px rgba(0, 28, 56, 0.15), 0 16px 32px rgba(0, 196, 214, 0.1);
            max-width: 440px;
            width: 100%;
            text-align: center;
            animation: slideInUp 0.8s cubic-bezier(0.165, 0.84, 0.44, 1);
            position: relative;
            z-index: 1;
            border: 1px solid rgba(0, 196, 214, 0.1);
          }

          @keyframes slideInUp {
            from {
              opacity: 0;
              transform: translateY(40px) scale(0.96);
            }
            to {
              opacity: 1;
              transform: translateY(0) scale(1);
            }
          }

          .auth-guard-header {
            margin-bottom: 40px;
          }

          .auth-guard-header h1 {
            color: #333333;
            margin-bottom: 12px;
            font-size: 32px;
            font-weight: 700;
            font-family: 'Inter', sans-serif;
            letter-spacing: -0.02em;
            line-height: 1.2;
          }

          .auth-guard-header p {
            color: #64748B;
            margin-bottom: 0;
            font-size: 16px;
            font-weight: 400;
            line-height: 1.5;
          }

          .auth-guard-form {
            margin-bottom: 32px;
          }

          .input-group {
            margin-bottom: 24px;
            text-align: left;
          }

          .input-group label {
            display: block;
            margin-bottom: 12px;
            color: #333333;
            font-weight: 600;
            font-size: 14px;
            font-family: 'Inter', sans-serif;
            letter-spacing: -0.01em;
          }

          .input-group input {
            width: 100%;
            padding: 16px 20px;
            border: 2px solid #F5F7FA;
            border-radius: 12px;
            font-size: 16px;
            font-family: 'Inter', sans-serif;
            transition: all 0.3s cubic-bezier(0.165, 0.84, 0.44, 1);
            box-sizing: border-box;
            background: #FFFFFF;
            color: #333333;
            outline: none;
          }

          .input-group input:focus {
            border-color: #00C4D6;
            box-shadow: 0 0 0 4px rgba(0, 196, 214, 0.1);
            transform: translateY(-1px);
          }

          .input-group input:hover:not(:focus) {
            border-color: rgba(0, 196, 214, 0.3);
          }

          .input-group input:disabled {
            background-color: #F5F7FA;
            cursor: not-allowed;
            opacity: 0.7;
          }

          .input-group input::placeholder {
            color: #64748B;
            font-weight: 400;
          }

          .error-message {
            background: linear-gradient(135deg, #FEF2F2 0%, #FEE2E2 100%);
            color: #EF4444;
            padding: 16px 20px;
            border-radius: 12px;
            margin-bottom: 24px;
            font-size: 14px;
            font-weight: 500;
            border: 1px solid rgba(239, 68, 68, 0.2);
            display: flex;
            align-items: center;
            gap: 8px;
          }

          .login-button {
            width: 100%;
            background: linear-gradient(135deg, #00C4D6 0%, #2563EB 100%);
            color: #FFFFFF;
            border: none;
            padding: 16px 24px;
            border-radius: 12px;
            font-size: 16px;
            font-weight: 600;
            font-family: 'Inter', sans-serif;
            cursor: pointer;
            transition: all 0.3s cubic-bezier(0.165, 0.84, 0.44, 1);
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 10px;
            letter-spacing: -0.01em;
            outline: none;
            position: relative;
            overflow: hidden;
          }

          .login-button::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: linear-gradient(135deg, #2563EB 0%, #001C38 100%);
            opacity: 0;
            transition: opacity 0.3s ease;
          }

          .login-button:hover:not(:disabled) {
            transform: translateY(-2px);
            box-shadow: 0 16px 32px rgba(0, 196, 214, 0.25), 0 8px 16px rgba(37, 99, 235, 0.15);
          }

          .login-button:hover:not(:disabled)::before {
            opacity: 1;
          }

          .login-button:active:not(:disabled) {
            transform: translateY(0);
          }

          .login-button:disabled {
            opacity: 0.6;
            cursor: not-allowed;
            transform: none;
            box-shadow: none;
          }

          .login-button span,
          .login-button .spinner {
            position: relative;
            z-index: 1;
          }

          .spinner {
            width: 18px;
            height: 18px;
            border: 2px solid rgba(255, 255, 255, 0.3);
            border-top: 2px solid #FFFFFF;
            border-radius: 50%;
            animation: spin 1s linear infinite;
          }

          @keyframes spin {
            to {
              transform: rotate(360deg);
            }
          }

          .auth-guard-footer {
            color: #64748B;
            font-size: 14px;
            line-height: 1.5;
          }

          .auth-guard-footer p {
            margin-bottom: 8px;
            font-weight: 500;
          }

          .auth-guard-footer small {
            color: #64748B;
            opacity: 0.8;
            font-weight: 400;
          }

          /* Mobile Responsive */
          @media (max-width: 640px) {
            .auth-guard-container {
              padding: 16px;
            }
            
            .auth-guard-card {
              padding: 32px 24px;
              border-radius: 16px;
            }
            
            .auth-guard-header h1 {
              font-size: 28px;
            }

            .auth-guard-header p {
              font-size: 15px;
            }
            
            .input-group input {
              padding: 14px 16px;
              font-size: 15px;
            }

            .login-button {
              padding: 14px 20px;
              font-size: 15px;
            }
          }

          @media (max-width: 480px) {
            .auth-guard-card {
              padding: 28px 20px;
            }
            
            .auth-guard-header h1 {
              font-size: 26px;
            }
          }
        `}</style>
        <div className="auth-guard-container">
          <div className="auth-guard-card">
            <div className="auth-guard-header">
              <h1>🔐 {AUTH_CONFIG.APP_TITLE}</h1>
              <p>Please enter the access password to continue</p>
            </div>
            
            <form onSubmit={handleLogin} className="auth-guard-form">
              <div className="input-group">
                <label htmlFor="password">Access Password</label>
                <input
                  type="password"
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  disabled={loading}
                  required
                />
              </div>
              
              {error && (
                <div className="error-message">
                  ❌ {error}
                </div>
              )}
              
              <button 
                type="submit" 
                disabled={loading || !password.trim()}
                className="login-button"
              >
                {loading ? (
                  <>
                    <span className="spinner"></span>
                    Verifying...
                  </>
                ) : (
                  'Access Application'
                )}
              </button>
            </form>
            
            <div className="auth-guard-footer">
              <p>🛡️ This application is password protected</p>
              <small>Contact admin if you need access credentials</small>
            </div>
          </div>
        </div>
      </>
    );
  }

  // If authenticated, render the main application with logout option
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
        
        .authenticated-app {
          min-height: 100vh;
          background-color: #F5F7FA;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }

        .app-header {
          background: #FFFFFF;
          padding: 20px 32px;
          box-shadow: 0 4px 6px rgba(0, 28, 56, 0.04), 0 2px 4px rgba(0, 196, 214, 0.06);
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 1px solid rgba(0, 196, 214, 0.1);
          position: sticky;
          top: 0;
          z-index: 100;
          backdrop-filter: blur(10px);
        }

        .app-title {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .app-title h2 {
          margin: 0;
          color: #333333;
          font-size: 24px;
          font-weight: 700;
          font-family: 'Inter', sans-serif;
          letter-spacing: -0.02em;
          background: linear-gradient(135deg, #001C38 0%, #00C4D6 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .auth-status {
          background: linear-gradient(135deg, #10B981 0%, rgba(16, 185, 129, 0.8) 100%);
          color: #FFFFFF;
          padding: 6px 16px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 600;
          font-family: 'Inter', sans-serif;
          letter-spacing: 0.02em;
          text-transform: uppercase;
          box-shadow: 0 2px 4px rgba(16, 185, 129, 0.2);
          border: 1px solid rgba(16, 185, 129, 0.3);
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .auth-status::before {
          content: '';
          width: 6px;
          height: 6px;
          background: #FFFFFF;
          border-radius: 50%;
          animation: pulse 2s infinite;
        }

        @keyframes pulse {
          0%, 100% {
            opacity: 1;
            transform: scale(1);
          }
          50% {
            opacity: 0.7;
            transform: scale(0.9);
          }
        }

        .logout-button {
          background: linear-gradient(135deg, #EF4444 0%, #DC2626 100%);
          color: #FFFFFF;
          border: none;
          padding: 10px 20px;
          border-radius: 10px;
          font-size: 14px;
          font-weight: 600;
          font-family: 'Inter', sans-serif;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.165, 0.84, 0.44, 1);
          display: flex;
          align-items: center;
          gap: 8px;
          letter-spacing: -0.01em;
          outline: none;
          position: relative;
          overflow: hidden;
        }

        .logout-button::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: linear-gradient(135deg, #DC2626 0%, #B91C1C 100%);
          opacity: 0;
          transition: opacity 0.3s ease;
        }

        .logout-button:hover {
          transform: translateY(-1px);
          box-shadow: 0 8px 16px rgba(239, 68, 68, 0.3);
        }

        .logout-button:hover::before {
          opacity: 1;
        }

        .logout-button:active {
          transform: translateY(0);
        }

        .logout-button span {
          position: relative;
          z-index: 1;
        }

        .app-content {
          padding: 0;
          background: #F5F7FA;
          min-height: calc(100vh - 80px);
        }

        /* Mobile Responsive */
        @media (max-width: 768px) {
          .app-header {
            padding: 16px 20px;
            flex-direction: column;
            gap: 12px;
            position: static;
          }
          
          .app-title {
            flex-direction: column;
            gap: 8px;
            text-align: center;
          }
          
          .app-title h2 {
            font-size: 22px;
          }

          .logout-button {
            padding: 8px 16px;
            font-size: 13px;
          }
        }

        @media (max-width: 640px) {
          .app-header {
            padding: 14px 16px;
          }
          
          .app-title h2 {
            font-size: 20px;
          }

          .auth-status {
            padding: 4px 12px;
            font-size: 11px;
          }
        }
      `}</style>
      <div className="authenticated-app">
        <div className="app-header">
          <div className="app-title">
            <h2>🚀 {AUTH_CONFIG.APP_TITLE}</h2>
            <span className="auth-status">Authenticated</span>
          </div>
          <button onClick={handleLogout} className="logout-button">
            <span>🚪 Logout</span>
          </button>
        </div>
        <div className="app-content">
          {children}
        </div>
      </div>
    </>
  );
};

export default AuthGuard;
