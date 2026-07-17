import { Navigate, Route, Routes } from 'react-router-dom'
import Landing from './pages/Landing.jsx'
import Login from './pages/Login.jsx'
import Register from './pages/Register.jsx'
import ForgotPassword from './pages/ForgotPassword.jsx'
import ResetPassword from './pages/ResetPassword.jsx'
import VerifyEmail from './pages/VerifyEmail.jsx'
import AppShell from './components/layout/AppShell.jsx'
import Overview from './pages/Overview.jsx'
import ExecutiveDashboard from './pages/ExecutiveDashboard.jsx'
import OperationsDashboard from './pages/OperationsDashboard.jsx'
import AnalyticsDashboard from './pages/AnalyticsDashboard.jsx'
import Chatbot from './pages/Chatbot.jsx'
import Tickets from './pages/Tickets.jsx'
import AdminTickets from './pages/AdminTickets.jsx'
import AdminUsers from './pages/AdminUsers.jsx'
import Profile from './pages/Profile.jsx'
import AwaitingAccess from './pages/AwaitingAccess.jsx'
import SupportConnect from './pages/SupportConnect.jsx'
import SupportDashboard from './pages/SupportDashboard.jsx'
import Customer360 from './pages/Customer360.jsx'
import NotFound from './pages/NotFound.jsx'
import {
  AdminRoute,
  ProtectedRoute,
  FullAccessRoute,
  DashboardRoute,
} from './components/ProtectedRoute.jsx'
// FullAccessRoute restricts to admin & company-side users.
import useAccess from './hooks/useAccess.js'

/** Send the user to the right landing screen based on their access. */
function AppIndex() {
  const access = useAccess()
  // Admin & company see the full overview; clients see a self-scoped one.
  if (access.canViewOverview || access.role === 'client') return <Overview />
  return <Navigate to={access.defaultPath} replace />
}

export default function App() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/verify-email" element={<VerifyEmail />} />

      {/* App (auth required) */}
      <Route path="/app" element={
        <ProtectedRoute><AppShell /></ProtectedRoute>
      }>
        <Route index element={<AppIndex />} />

        <Route path="dashboards/executive"  element={
          <DashboardRoute category="executive"><ExecutiveDashboard /></DashboardRoute>
        } />
        <Route path="dashboards/operations" element={
          <DashboardRoute category="operations"><OperationsDashboard /></DashboardRoute>
        } />
        <Route path="dashboards/analytics"  element={
          <DashboardRoute category="analytics"><AnalyticsDashboard /></DashboardRoute>
        } />

        <Route path="chatbot"  element={<Chatbot />} />
        <Route path="tickets"  element={<Tickets />} />
        <Route path="profile"  element={<Profile />} />
        <Route path="awaiting" element={<AwaitingAccess />} />

        <Route path="support" element={<SupportConnect />} />
        <Route path="support/dashboard" element={
          <FullAccessRoute><SupportDashboard /></FullAccessRoute>
        } />
        <Route path="support/customer/:id" element={
          <FullAccessRoute><Customer360 /></FullAccessRoute>
        } />

        {/* Approvals are open to admin + company-side; user management
            stays admin-only. */}
        <Route path="admin/tickets" element={<FullAccessRoute><AdminTickets /></FullAccessRoute>} />
        <Route path="admin/users"   element={<AdminRoute><AdminUsers /></AdminRoute>} />
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}
