// Password Configuration for Campaign Migration Tool
// You can change these settings as needed

export const AUTH_CONFIG = {
  // The main access password for the application
  // Change this to your desired password
  PASSWORD: 'CampaignMigration2025!',
  
  // Session duration in milliseconds (24 hours = 24 * 60 * 60 * 1000)
  SESSION_DURATION: 24 * 60 * 60 * 1000,
  
  // Whether to remember authentication across browser sessions
  REMEMBER_AUTH: true,
  
  // Application title
  APP_TITLE: 'MoEngage Migration Tool',
  
  // Optional: You can add multiple passwords for different users
  // MULTIPLE_PASSWORDS: [
  //   'CampaignMigration2024!',
  //   'AdminPassword123!',
  //   'DeveloperAccess2024!'
  // ]
};

// Instructions for changing the password:
// 1. Change the PASSWORD value above to your desired password
// 2. Save this file
// 3. Restart your React application
// 4. The new password will be active immediately

// Security Notes:
// - This is a simple client-side authentication suitable for basic access control
// - For production use, consider implementing server-side authentication
// - The password is stored in the client code, so it's not suitable for highly sensitive applications
// - Consider using environment variables for production deployments

// 0f2d74df0841d44203f7bc00192766a1
// 68b177e2dafb37006231838e