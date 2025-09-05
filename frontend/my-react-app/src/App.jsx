import React from 'react';
import { Routes, Route } from 'react-router-dom';
import AuthGuard from './components/AuthGuard';
import LoginPage from './components/LoginPage';
import CampaignsPage from './components/CampaignsPage';
import ViewDetailsPage from './components/ViewDetailsPage';
import MigrationProgressPage from './components/MigrationProgressPage';
// Testing components
import BrazeMoEngageMigrator from './components/testing/BrazeMoEngageMigrator'; 
import BrazePushMigrator from './components/testing/BrazePushMigrator';
import BrazeSMSMigrator from './components/testing/BrazeSMSMigrator';

function App() {
  return (
    <AuthGuard>
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route path="/campaigns" element={<CampaignsPage />} />
        <Route path="/campaign/:campaignId/details" element={<ViewDetailsPage />} />
        <Route path="/migration-progress" element={<MigrationProgressPage />} />
        {/* Testing routes */}
        <Route path="/draft-migrator" element={<BrazeMoEngageMigrator />} />
        <Route path="/push-migrator" element={<BrazePushMigrator />} />
        <Route path="/sms-migrator" element={<BrazeSMSMigrator />} />
      </Routes>
    </AuthGuard>
  );
}

export default App;