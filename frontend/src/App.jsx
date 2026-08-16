import { Navigate, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import EventsPage from './pages/EventsPage.jsx';
import ParticipantsPage from './pages/ParticipantsPage.jsx';
import RegistrationsPage from './pages/RegistrationsPage.jsx';

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/evenements" element={<EventsPage />} />
        <Route path="/participants" element={<ParticipantsPage />} />
        <Route path="/inscriptions" element={<RegistrationsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}
