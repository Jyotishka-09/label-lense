import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import OfficialLayout from './components/OfficialLayout';
import AuthorityLayout from './components/AuthorityLayout';
import ProtectedRoute from './components/ProtectedRoute';

// ── Public Citizen Pages ──
import Home from './pages/Home';
import History from './pages/History';

// ── Citizen Auth ──
import CitizenLogin from './pages/citizen/CitizenLogin';
import CitizenDashboard from './pages/citizen/CitizenDashboard';

// ── Citizen Protected Pages ──
import Scan from './pages/Scan';
import ScanResult from './pages/citizen/ScanResult';
import Complaint from './pages/citizen/Complaint';
import ComplaintSuccess from './pages/citizen/ComplaintSuccess';
import MyComplaints from './pages/citizen/MyComplaints';
import ComplaintDetail from './pages/citizen/ComplaintDetail';

// ── Official Login (redesigned, two-card) ──
import OfficialLogin from './pages/official/OfficialLogin';

// ── Inspector Protected Pages ──
import InspectorDashboard from './pages/official/InspectorDashboard';
import InspectorInspection from './pages/official/InspectorInspection';

// ── Authority Protected Pages ──
import AuthorityDashboard from './pages/official/AuthorityDashboard';

function App() {
  return (
    <Routes>

      {/* ── Public Routes (citizen-facing layout) ── */}
      <Route path="/" element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="history" element={<History />} />

        {/* Backward compat redirect */}
        <Route path="results" element={<Navigate to="/scan/result" replace />} />

        {/* ── Citizen Auth ── */}
        <Route path="citizen/login" element={<CitizenLogin />} />
        <Route
          path="citizen"
          element={
            <ProtectedRoute role="CITIZEN">
              <CitizenDashboard />
            </ProtectedRoute>
          }
        />

        {/* ── Citizen Protected Workflow ── */}
        <Route
          path="scan"
          element={
            <ProtectedRoute role="CITIZEN">
              <Scan />
            </ProtectedRoute>
          }
        />
        <Route
          path="scan/result"
          element={
            <ProtectedRoute role="CITIZEN">
              <ScanResult />
            </ProtectedRoute>
          }
        />
        <Route
          path="complaint"
          element={
            <ProtectedRoute role="CITIZEN">
              <Complaint />
            </ProtectedRoute>
          }
        />
        <Route
          path="complaint/success"
          element={
            <ProtectedRoute role="CITIZEN">
              <ComplaintSuccess />
            </ProtectedRoute>
          }
        />
        <Route
          path="citizen/complaints"
          element={
            <ProtectedRoute role="CITIZEN">
              <MyComplaints />
            </ProtectedRoute>
          }
        />
        <Route
          path="citizen/complaints/:id"
          element={
            <ProtectedRoute role="CITIZEN">
              <ComplaintDetail />
            </ProtectedRoute>
          }
        />
      </Route>

      {/* ── Official Login (public, no layout wrapper) ── */}
      <Route path="/official/login" element={<OfficialLogin />} />

      {/* ── Inspector Protected Routes ── */}
      <Route
        path="/official/inspector"
        element={
          <ProtectedRoute role="INSPECTOR">
            <OfficialLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<InspectorDashboard />} />
        <Route path="inspection/:id" element={<InspectorInspection />} />
      </Route>

      {/* ── Authority Protected Routes ── */}
      <Route
        path="/official/authority"
        element={
          <ProtectedRoute role="AUTHORITY">
            <AuthorityLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<AuthorityDashboard />} />
      </Route>

      {/* Catch-all fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;