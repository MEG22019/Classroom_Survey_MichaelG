import { Navigate, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { AuthGuard } from './components/AuthGuard';
import { useAuthState } from './lib/auth';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import SurveyEditorPage from './pages/SurveyEditorPage';
import PresentSurveyPage from './pages/PresentSurveyPage';
import ResultsPage from './pages/ResultsPage';
import PublicSurveyPage from './pages/PublicSurveyPage';
import NotFoundPage from './pages/NotFoundPage';

export default function App() {
  const { ready, authenticated } = useAuthState();

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route
          path="/login"
          element={ready && authenticated ? <Navigate to="/dashboard" replace /> : <LoginPage />}
        />
        <Route path="/dashboard" element={<AuthGuard><DashboardPage /></AuthGuard>} />
        <Route path="/surveys/new" element={<AuthGuard><SurveyEditorPage /></AuthGuard>} />
        <Route path="/surveys/:surveyId/edit" element={<AuthGuard><SurveyEditorPage /></AuthGuard>} />
        <Route path="/surveys/:surveyId/present" element={<AuthGuard><PresentSurveyPage /></AuthGuard>} />
        <Route path="/surveys/:surveyId/results" element={<AuthGuard><ResultsPage /></AuthGuard>} />
        <Route path="/s/:slug" element={<PublicSurveyPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Layout>
  );
}
