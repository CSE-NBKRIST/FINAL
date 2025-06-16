import React, { useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Login from './components/Login';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import Students from './components/Students';
import Experiments from './components/Experiments';
import VivaQuestions from './components/VivaQuestions';
import Submissions from './components/Submissions';
import Profile from './components/Profile';
import PasswordChangeModal from './components/PasswordChangeModal';

const AppContent: React.FC = () => {
  const { currentUser, userProfile } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');

  if (!currentUser || !userProfile) {
    return <Login />;
  }

  // Check if student needs to change password
  if (userProfile.role === 'student' && !userProfile.passwordChanged) {
    return <PasswordChangeModal />;
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard />;
      case 'students':
        return userProfile.role === 'faculty' ? <Students /> : <Dashboard />;
      case 'experiments':
        return <Experiments />;
      case 'viva-questions':
        return userProfile.role === 'faculty' ? <VivaQuestions /> : <Dashboard />;
      case 'submissions':
        return userProfile.role === 'faculty' ? <Submissions /> : <Dashboard />;
      case 'profile':
        return <Profile />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <Layout activeTab={activeTab} onTabChange={setActiveTab}>
      {renderContent()}
    </Layout>
  );
};

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;