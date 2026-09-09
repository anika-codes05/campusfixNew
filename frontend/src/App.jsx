import { Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import { RequireAuth, RequireAdmin, GuestOnly } from './components/ProtectedRoute';
import Login from './pages/Login';
import Register from './pages/Register';
import StudentFeed from './pages/StudentFeed';
import ReportIssue from './pages/ReportIssue';
import IssueDetail from './pages/IssueDetail';
import MyIssues from './pages/MyIssues';
import AdminDashboard from './pages/AdminDashboard';
import NotFound from './pages/NotFound';

export default function App() {
  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="animate-fade-rise">
        <Routes>
          <Route path="/login" element={<GuestOnly><Login /></GuestOnly>} />
          <Route path="/register" element={<GuestOnly><Register /></GuestOnly>} />
          <Route path="/" element={<RequireAuth><StudentFeed /></RequireAuth>} />
          <Route path="/report" element={<RequireAuth><ReportIssue /></RequireAuth>} />
          <Route path="/issues/:id" element={<RequireAuth><IssueDetail /></RequireAuth>} />
          <Route path="/my-issues" element={<RequireAuth><MyIssues /></RequireAuth>} />
          <Route path="/admin" element={<RequireAdmin><AdminDashboard /></RequireAdmin>} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
    </div>
  );
}
