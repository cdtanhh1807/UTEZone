// components/content/admin/Dashboard.tsx
import React, { useMemo, lazy, Suspense } from 'react';
import styles from './AdminDashboard.module.css';
import { faker } from '@faker-js/faker';

/* ---------- FAKER HELPER ---------- */
const rand = (min: number, max: number) => faker.number.int({ min, max });

/* ---- 1. Tổng số bài theo ngày / tháng / năm ---- */
const todayPosts = rand(50, 150);
const monthPosts = rand(1000, 3000);
const yearPosts = rand(15000, 40000);

/* ---- 2. User active theo giờ (24 cột) ---- */
const fakeHourlyActive = Array.from({ length: 24 }, (_, h) => ({
  hour: `${h.toString().padStart(2, '0')}:00`,
  users: rand(5, 80),
}));

/* ---- 3. Top 10 bài & tài khoản ---- */
type TopItem = { title: string; account: string; value: number };

const fakeTopInteract: TopItem[] = Array.from({ length: 10 }, (_, i) => ({
  title: `Bài viết ${i + 1}`,
  account: ['alice', 'bob', 'carol', 'david', 'eva'][i % 5],
  value: rand(200, 2000),
})).sort((a, b) => b.value - a.value);

const fakeTopComplaint: TopItem[] = Array.from({ length: 10 }, (_, i) => ({
  title: `Bài viết ${i + 1}`,
  account: ['alice', 'bob', 'carol', 'david', 'eva'][i % 5],
  value: rand(5, 100),
})).sort((a, b) => b.value - a.value);

/* ---- 4. Keyword cloud ---- */
const fakeKeywords = ['AI', 'Du lịch', 'Ẩm thực', 'Công nghệ', 'Thời trang', 'Tình yêu', 'Game', 'Crypto'];
const topKeywords = faker.helpers.arrayElements(fakeKeywords, 5).map((k) => ({
  text: k,
  value: rand(50, 300),
}));
const maxKW = Math.max(...topKeywords.map((k) => k.value));

/* ---- 5. ApexCharts (lazy load) ---- */
const ApexChart = lazy(() => import('react-apexcharts'));

/* ---------- COMPONENT ---------- */
const Dashboard: React.FC = () => {
  /* ---- User active 24h ---- */
  const hourlyChart = useMemo(() => {
    const categories = fakeHourlyActive.map((h) => h.hour);
    const series = [{ name: 'User online', data: fakeHourlyActive.map((h) => h.users) }];
    return {
      options: {
        chart: { type: 'bar', height: 260, toolbar: { show: false } },
        plotOptions: { bar: { borderRadius: 4, columnWidth: '50%' } },
        dataLabels: { enabled: false },
        xaxis: { categories, axisBorder: { show: false }, axisTicks: { show: false } },
        yaxis: { show: true },
        grid: { show: false },
        colors: ['#3366ff'],
      },
      series,
    };
  }, []);

  /* ---- Top tương tác (ngang) ---- */
  const interactChart = useMemo(() => {
    const categories = fakeTopInteract.map((it) => `${it.title} (@${it.account})`);
    const series = [{ name: 'Tương tác', data: fakeTopInteract.map((it) => it.value) }];
    return {
      options: {
        chart: { type: 'bar', height: 360, toolbar: { show: false } },
        plotOptions: { bar: { horizontal: true, borderRadius: 4 } },
        dataLabels: { enabled: false },
        xaxis: { categories, axisBorder: { show: false }, axisTicks: { show: false } },
        yaxis: { show: true },
        grid: { show: false },
        colors: ['#fa0'],
      },
      series,
    };
  }, []);

  /* ---- Top khiếu nại (ngang) ---- */
  const complaintChart = useMemo(() => {
    const categories = fakeTopComplaint.map((it) => `${it.title} (@${it.account})`);
    const series = [{ name: 'Khiếu nại', data: fakeTopComplaint.map((it) => it.value) }];
    return {
      options: {
        chart: { type: 'bar', height: 360, toolbar: { show: false } },
        plotOptions: { bar: { horizontal: true, borderRadius: 4 } },
        dataLabels: { enabled: false },
        xaxis: { categories, axisBorder: { show: false }, axisTicks: { show: false } },
        yaxis: { show: true },
        grid: { show: false },
        colors: ['#ff3d71'],
      },
      series,
    };
  }, []);

  return (
    <div className={styles.page}>
      <div className={styles.grid4}>
        <StatCard title="Bài trong ngày" value={todayPosts} color="green" />
        <StatCard title="Bài trong tháng" value={monthPosts} color="purple" />
        <StatCard title="Bài trong năm" value={yearPosts} color="red" />
        <div></div>
      </div>

      {/* ---- 2. User Active 24h ---- */}
      <section className={styles.statSection}>
        <h3 className={styles.statTitle}>Mức độ hoạt động của user theo giờ</h3>
        <div className={styles.chartBox}>
          <Suspense fallback={<div>Loading chart...</div>}>
            <ApexChart options={hourlyChart.options} series={hourlyChart.series} type="bar" height={260} />
          </Suspense>
        </div>
      </section>

      {/* ---- 4. Top tương tác ---- */}
      <section className={styles.statSection}>
        <h3 className={styles.statTitle}>Top 10 bài đăng & tài khoản nhiều tương tác nhất</h3>
        <div className={styles.chartBox} style={{ height: 360 }}>
          <Suspense fallback={<div>Loading chart...</div>}>
            <ApexChart options={interactChart.options} series={interactChart.series} type="bar" height={360} />
          </Suspense>
        </div>
      </section>

      {/* ---- 5. Top khiếu nại ---- */}
      <section className={styles.statSection}>
        <h3 className={styles.statTitle}>Top 10 bài đăng & tài khoản bị khiếu nại nhiều nhất</h3>
        <div className={styles.chartBox} style={{ height: 360 }}>
          <Suspense fallback={<div>Loading chart...</div>}>
            <ApexChart options={complaintChart.options} series={complaintChart.series} type="bar" height={360} />
          </Suspense>
        </div>
      </section>
    </div>
  );
};

/* ---------- StatCard nhỏ gọn ---------- */
const StatCard: React.FC<{ title: string; value: number | string; color: 'green' | 'purple' | 'pink' | 'red' }> = ({
  title,
  value,
  color,
}) => {
  const colorVar = { green: '#00d68f', purple: '#6c2486ff', pink: '#ff3d71', red: 'rgba(255, 14, 14, 1)' }[color];
  return (
    <div className={styles.card} style={{ borderLeft: `4px solid ${colorVar}` }}>
      <div className={styles.cardTitle}>{title}</div>
      <div className={styles.cardValue} style={{ color: colorVar }}>
        {typeof value === 'number' ? value.toLocaleString('vi-VN') : value}
      </div>
    </div>
  );
};

export default Dashboard;
