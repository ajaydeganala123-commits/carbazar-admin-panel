import { Route, Routes } from 'react-router-dom';

import ProtectedRoute from './components/ProtectedRoute';
import Auctions from './pages/Auctions';
import Chats from './pages/Chats';
import Dashboard from './pages/Dashboard';
import Deals from './pages/Deals';
import Listings from './pages/Listings';
import ListingDetail from './pages/ListingDetail';
import Login from './pages/Login';
import Reports from './pages/Reports';
import Support from './pages/Support';
import UserDetail from './pages/UserDetail';
import Users from './pages/Users';
import Verifications from './pages/Verifications';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/"
        element={<ProtectedRoute>{(email) => <Dashboard email={email} />}</ProtectedRoute>}
      />
      <Route
        path="/verifications"
        element={<ProtectedRoute>{(email) => <Verifications email={email} />}</ProtectedRoute>}
      />
      <Route
        path="/users"
        element={<ProtectedRoute>{(email) => <Users email={email} />}</ProtectedRoute>}
      />
      <Route
        path="/users/:uid"
        element={
          <ProtectedRoute>{(email) => <UserDetail email={email} />}</ProtectedRoute>
        }
      />
      <Route
        path="/listings"
        element={<ProtectedRoute>{(email) => <Listings email={email} />}</ProtectedRoute>}
      />
      <Route
        path="/listings/:id"
        element={
          <ProtectedRoute>{(email) => <ListingDetail email={email} />}</ProtectedRoute>
        }
      />
      <Route
        path="/auctions"
        element={<ProtectedRoute>{(email) => <Auctions email={email} />}</ProtectedRoute>}
      />
      <Route
        path="/auctions/:id"
        element={
          <ProtectedRoute>{(email) => <ListingDetail email={email} />}</ProtectedRoute>
        }
      />
      <Route
        path="/deals"
        element={<ProtectedRoute>{(email) => <Deals email={email} />}</ProtectedRoute>}
      />
      <Route
        path="/chats"
        element={<ProtectedRoute>{(email) => <Chats email={email} />}</ProtectedRoute>}
      />
      <Route
        path="/chats/:chatId"
        element={<ProtectedRoute>{(email) => <Chats email={email} />}</ProtectedRoute>}
      />
      <Route
        path="/reports"
        element={<ProtectedRoute>{(email) => <Reports email={email} />}</ProtectedRoute>}
      />
      <Route
        path="/support"
        element={<ProtectedRoute>{(email) => <Support email={email} />}</ProtectedRoute>}
      />
      <Route
        path="*"
        element={<ProtectedRoute>{(email) => <Dashboard email={email} />}</ProtectedRoute>}
      />
    </Routes>
  );
}
