import React from 'react';
import { Routes, Route } from 'react-router-dom';
import AuthGuard from './components/AuthGuard';
import PlatformSelectionPage from './components/PlatformSelectionPage';
import LoginPage from './components/LoginPage';
import CampaignsPage from './components/CampaignsPage';
import ViewDetailsPage from './components/ViewDetailsPage';
import MigrationProgressPage from './components/MigrationProgressPage';
import ContentBlocksLoginPage from './components/ContentBlocksLoginPage';
import ContentBlocksPage from './components/ContentBlocksPage';
// Testing components
import BrazeMoEngageMigrator from './components/testing/BrazeMoEngageMigrator'; 
import BrazePushMigrator from './components/testing/BrazePushMigrator';
import BrazeSMSMigrator from './components/testing/BrazeSMSMigrator';

function App() {
  return (
    <AuthGuard>
      <Routes>
        <Route path="/" element={<PlatformSelectionPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/campaigns" element={<CampaignsPage />} />
        <Route path="/campaign/:campaignId/details" element={<ViewDetailsPage />} />
        <Route path="/migration-progress" element={<MigrationProgressPage />} />
        <Route path="/content-blocks-login" element={<ContentBlocksLoginPage />} />
        <Route path="/content-blocks" element={<ContentBlocksPage />} />
        {/* Testing routes */}
        <Route path="/draft-migrator" element={<BrazeMoEngageMigrator />} />
        <Route path="/push-migrator" element={<BrazePushMigrator />} />
        <Route path="/sms-migrator" element={<BrazeSMSMigrator />} />
      </Routes>
    </AuthGuard>
  );
}

export default App;