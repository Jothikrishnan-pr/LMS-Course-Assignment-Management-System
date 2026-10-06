import { Link, Route, Routes } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Courses from './pages/Courses';
import MyCourses from './pages/MyCourses';
import CourseDetail from './pages/CourseDetail';
import Assignments from './pages/Assignments';
import Submissions from './pages/Submissions';
import ManageCourses from './pages/ManageCourses';
import AdminUsers from './pages/AdminUsers';
import AuditLog from './pages/AuditLog';

const Message = ({ title }) => (
  <div className="container"><h2>{title}</h2><Link to="/">Go home</Link></div>
);

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/courses" element={<Courses />} />
          <Route path="/my-courses" element={<MyCourses />} />
          <Route path="/courses/:id" element={<CourseDetail />} />
          <Route path="/assignments" element={<Assignments />} />
          <Route path="/submissions" element={<Submissions />} />
          <Route element={<ProtectedRoute roles={['TRAINER', 'ADMIN']} />}>
            <Route path="/manage/courses" element={<ManageCourses />} />
          </Route>
          <Route element={<ProtectedRoute roles={['ADMIN']} />}>
            <Route path="/admin/users" element={<AdminUsers />} />
            <Route path="/admin/audit" element={<AuditLog />} />
          </Route>
          <Route path="/forbidden" element={<Message title="403 - You are not allowed to view this page" />} />
        </Route>
      </Route>
      <Route path="*" element={<Message title="404 - Page not found" />} />
    </Routes>
  );
}
