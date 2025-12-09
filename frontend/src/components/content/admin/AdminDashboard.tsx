import {
  Routes,
  Route,
  NavLink,
  Navigate,
} from 'react-router-dom';
import styles from './AdminDashboard.module.css';
import AccountManager from './AccountManager';
import PolicyManager from './PolicyManager';
import ReportManager from './ReportManager';
import BanManager from './BanManager';
import ComplaintManager from './ComplaintManager';
import Dashboard from './Dashboard';
import ApproveHistory from './ApproveHistory';

const SideBar: React.FC = () => {
  const navs = [
    { to: '/admin', label: 'Thống kê', end: true },
    { to: '/admin/account', label: 'Tài khoản' },
    { to: '/admin/report', label: 'Tố cáo' },
    { to: '/admin/approve_history', label: 'Lịch sử kiểm duyệt' },
    { to: '/admin/ban', label: 'Chặn' },
    { to: '/admin/complaint', label: 'Khiếu nại' },
    { to: '/admin/policy', label: 'Chính sách' },
  ];
  return (
    <aside className={styles.sideBar}>
      <h2 className={styles.logo}>UTE Zone</h2>
      <nav>
        {navs.map((n) => (
          <NavLink
            key={n.to}
            to={n.to}
            end={n.end}
            className={({ isActive }) =>
              isActive ? styles.navActive : styles.navLink
            }
          >
            {n.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
};

const TopBar: React.FC = () => (
  <header className={styles.topBar}>
    <span className={styles.breadcrumb}>Trang quản trị</span>
    <div className={styles.user}>Admin</div>
  </header>
);

const AdminDashboard: React.FC = () => (
  <div className={styles.wrapper}>
    <SideBar />
    <div className={styles.main}>
      <TopBar />
      <div className={styles.content}>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/account" element={<AccountManager />} />
          <Route path="/ban" element={<BanManager />} />
          <Route path="/report" element={<ReportManager />} />
          <Route path="/approve_history" element={<ApproveHistory />} />
          <Route path="/policy" element={<PolicyManager />} />
          <Route path="/complaint" element={<ComplaintManager />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </div>
  </div>
);

export default AdminDashboard;