/* ReportManager.tsx */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import styles from './AdminDashboard.module.css';
import MySelect from '../../../styles/MySelect';
import DatePicker from 'react-datepicker';
import { vi } from 'date-fns/locale';
import 'react-datepicker/dist/react-datepicker.css';

/* ---------- types ---------- */
type ReportFromApi = {
    id: string; // 💡 đổi từ _id → id
    policyId: string;
    policyName: string;
    violatorEmail: string;
    violatorName: string;
    annunciator: {
        annunciatorEmail: string;
        annunciatorName: string;
        description: string;
        reportedAt: string;
    }[];
    typeContent: 'account' | 'post' | 'comment' | 'message';
    contentId: string | null;
    contentParentId: string | null;
    content: string | null;
    verifyStatus: boolean;
    violation?: string[] | null;
};

/* ---------- constants ---------- */
const TYPE_LABELS: Record<ReportFromApi['typeContent'], string> = {
    account: 'Tài khoản',
    post: 'Bài viết',
    comment: 'Bình luận',
    message: 'Tin nhắn',
};

const LIMIT_PER_PAGE = 20;

/* ---------- component ---------- */
const ReportManager: React.FC = () => {
    /* ---------- state ---------- */
    const [reports, setReports] = useState<ReportFromApi[]>([]);
    const [page, setPage] = useState(1);

    /* ---------- filter ---------- */
    const [keyword, setKeyword] = useState('');
    const [typeFilter, setTypeFilter] = useState<'all' | ReportFromApi['typeContent']>('all');
    const [selectedDate, setSelectedDate] = useState<string>(''); // YYYY-MM-DD

    /* ---------- modal ---------- */
    const [isOpen, setIsOpen] = useState(false);
    const [editing, setEditing] = useState<ReportFromApi | null>(null);

    const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
    const showToast = (msg: string, ok: boolean) => {
        setToast({ msg, ok });
        setTimeout(() => setToast(null), 2500);
    };

    /* ---------- fetch ---------- */
    useEffect(() => {
        fetch(`http://localhost:8000/report/get_all_report`)
            .then((r) => r.json())
            .then((data: ReportFromApi[]) => setReports(data))
            .catch((err) => {
                console.error("Lỗi khi lấy danh sách: ", err);
                showToast("Không thể tải danh sách: " + err, false);
            });
    }, []);

    /* ---------- filter & phân trang ---------- */
    const filtered = useMemo(() => {
        let list = reports;

        /* 1. Lọc theo ngày */
        if (selectedDate) {
            const target = new Date(selectedDate);
            list = list.filter((r) => {
                const d = new Date(r.annunciator[0]?.reportedAt || 0);
                return (
                    d.getFullYear() === target.getFullYear() &&
                    d.getMonth() === target.getMonth() &&
                    d.getDate() === target.getDate()
                );
            });
        }

        /* 2. Lọc theo loại */
        if (typeFilter !== 'all') list = list.filter((r) => r.typeContent === typeFilter);

        /* 3. Lọc theo email bị tố cáo */
        if (keyword.trim()) {
            const kw = keyword.toLowerCase();
            list = list.filter((r) => r.violatorEmail.toLowerCase().includes(kw));
        }

        return list;
    }, [reports, selectedDate, typeFilter, keyword]);

    const totalPages = useMemo(() => Math.ceil(filtered.length / LIMIT_PER_PAGE), [filtered]);
    const pagedList = useMemo(() => {
        const start = (page - 1) * LIMIT_PER_PAGE;
        return filtered.slice(start, start + LIMIT_PER_PAGE);
    }, [filtered, page]);

    /* ---------- suggest ---------- */
    const isFocusRef = useRef(false);
    const [suggest, setSuggest] = useState<string[]>([]);
    const [showSuggest, setShowSuggest] = useState(false);

    useEffect(() => {
        if (!keyword.trim()) {
            setSuggest([]);
            setShowSuggest(false);
            return;
        }
        const kw = keyword.toLowerCase();
        const allowed = Array.from(new Set(filtered.map((r) => r.violatorEmail.toLowerCase())));
        const res = allowed.filter((e) => e.includes(kw));
        setSuggest(res);
        if (isFocusRef.current) setShowSuggest(res.length > 0);
    }, [keyword, filtered]);

    /* ---------- modal ---------- */
    const openDetailModal = (r: ReportFromApi) => {
        setEditing(r);
        document.body.classList.add('modal-open');
        setIsOpen(true);
    };
    const closeModal = () => {
        setIsOpen(false);
        document.body.classList.remove('modal-open');
        setEditing(null);
    };

    /* ---------- fetch mới ---------- */
    const reloadReports = async () => {
        try {
            const res = await fetch('http://localhost:8000/report/get_all_report');
            const data: ReportFromApi[] = await res.json();
            setReports(data);
        } catch (e) {
            console.error('Lỗi reload:', e);
        }
    };

    /* ---------- Xử lý API ---------- */
    const handleReject = async () => {
        if (!editing) return;

        const body = editing.contentId
            ? { element: 'content', elementId: editing.contentId, policyId: editing.policyId }
            : { element: 'account', elementId: editing.violatorEmail, policyId: editing.policyId };

        try {
            const res = await fetch('http://localhost:8000/report/reject_report', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });

            if (!res.ok) throw new Error();
            showToast('Bỏ qua thành công!', true);
            await reloadReports();
            setPage(1);
        } catch (e: any) {
            showToast('Bỏ qua thất bại: ' + e.message, false);
            await reloadReports();
            setPage(1);
        }

        closeModal();
    };

    const handleApprove = async () => {
        if (!editing) return;

        // const body = editing.contentId
        //     ? {
        //         element: 'content',
        //         elementId: editing.contentId,
        //         policyId: editing.policyId,
        //     }
        //     : {
        //         element: 'account',
        //         elementId: editing.violatorEmail,
        //         policyId: editing.policyId,
        //     };
        const body: any = {
            element: editing.typeContent,
            elementId: editing.contentId || editing.violatorEmail,
            policyId: editing.policyId,
        };

        if (editing.typeContent === 'comment') {
            body.elementParentId = editing.contentParentId;
        }

        try {
            const res = await fetch('http://localhost:8000/report/approve_report', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });

            if (!res.ok) throw new Error();
            showToast('Phê duyệt thành công!', true);
            await reloadReports();
            setPage(1);
        } catch (e: any) {
            showToast('Phê duyệt thất bại: ' + e.message, false);
            await reloadReports();
            setPage(1);
        }

        closeModal();
    };

    /* ---------- render ---------- */
    return (
        <>
            <div className={styles.page}>
                {/* ---------- Toolbar ---------- */}
                <div className={`${styles.toolbar} ${styles.toolbarBetween}`}>
                    <div className={styles.filterLeft}>
                        {/* Date picker */}
                        {/* Search */}
                        <input
                            className={styles.search}
                            placeholder="Tìm theo email tài khoản bị tố cáo"
                            value={keyword}
                            onChange={(e) => {
                                setKeyword(e.target.value);
                                setPage(1);
                            }}
                            onFocus={() => {
                                isFocusRef.current = true;
                                if (keyword && suggest.length > 0) setShowSuggest(true);
                            }}
                            onBlur={() => {
                                isFocusRef.current = false;
                                setTimeout(() => setShowSuggest(false), 150);
                            }}
                        />
                        {showSuggest && (
                            <ul className={styles.suggestBox}>
                                {suggest.map((email) => (
                                    <li
                                        key={email}
                                        onClick={() => {
                                            setKeyword(email);
                                            setShowSuggest(false);
                                            setPage(1);
                                        }}
                                    >
                                        {email}
                                    </li>
                                ))}
                            </ul>
                        )}

                        {/* Type filter */}
                        <MySelect
                            placeholder="Tất cả loại nội dung"
                            value={typeFilter}
                            onChange={(v: string) => {
                                setTypeFilter(v === 'all' ? 'all' : v as typeof typeFilter);
                                setPage(1);
                            }}
                            options={[
                                { value: 'all', label: 'Tất cả loại' },
                                { value: 'account', label: 'Tài khoản' },
                                { value: 'post', label: 'Bài viết' },
                                { value: 'comment', label: 'Bình luận' },
                                { value: 'message', label: 'Tin nhắn' },
                            ]}
                        />

                        <DatePicker
                            selected={selectedDate ? new Date(selectedDate) : null}
                            onChange={(date: Date | null) =>
                                setSelectedDate(date ? date.toISOString().slice(0, 10) : '')
                            }
                            dateFormat="dd/MM/yyyy"
                            placeholderText="Chọn ngày"
                            locale={vi}
                            className={styles.dateInput}
                        />
                    </div>
                </div>

                {/* ---------- Table ---------- */}
                <div className={styles.tableWrapper}>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th>Loại</th>
                                {/* <th>Tài khoản tố cáo</th> */}
                                {typeFilter === 'account' && <th>Tài khoản bị tố cáo</th>}
                                {typeFilter === 'post' && <th>ID bài viết</th>}
                                {typeFilter === 'comment' && <th>ID bình luận</th>}
                                {typeFilter === 'message' && <th>ID tin nhắn</th>}
                                <th>Chính sách</th>
                                <th>Thời gian</th>
                                <th>Hành động</th>
                            </tr>
                        </thead>
                        <tbody>
                            {pagedList.map((r) => (
                                <tr key={r.id}>
                                    <td>{TYPE_LABELS[r.typeContent]}</td>
                                    {/* <td>
                                        {r.annunciatorName} ({r.annunciatorEmail})
                                    </td> */}
                                    {typeFilter === 'account' && <td>{`${r.violatorName} (${r.violatorEmail})`}</td>}
                                    {(typeFilter === 'post' || typeFilter === 'comment' || typeFilter === 'message') && (
                                        <td>{r.contentId ?? ''}</td>
                                    )}
                                    <td>{r.policyName}</td>
                                    <td>{new Date(r.annunciator[0]?.reportedAt || 0).toLocaleDateString('vi-VN')}</td>
                                    <td>
                                        <button className={styles.textBtn} onClick={() => openDetailModal(r)}>
                                            Chi tiết
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* ---------- Pagination ---------- */}
                {totalPages > 1 && (
                    <div className={styles.pagination}>
                        <button disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
                            Trước
                        </button>
                        <span>
                            {page} / {totalPages}
                        </span>
                        <button disabled={page === totalPages} onClick={() => setPage((p) => p + 1)}>
                            Sau
                        </button>
                    </div>
                )}
            </div>

            {/* ---------- Modal ---------- */}
            <Transition appear show={isOpen} as={Fragment}>
                <Dialog as="div" className={styles.modalOverlay} onClose={closeModal}>
                    <Transition.Child
                        as={Fragment}
                        enter="ease-out duration-150"
                        enterFrom="opacity-0 scale-95"
                        enterTo="opacity-100 scale-100"
                        leave="ease-in duration-100"
                        leaveFrom="opacity-100 scale-100"
                        leaveTo="opacity-0 scale-95"
                    >
                        <div className={styles.modalContent}>
                            <Dialog.Panel className={styles.modalPanel}>
                                <Dialog.Title as="h3" className={styles.modalTitle}>
                                    Chi tiết tố cáo
                                </Dialog.Title>

                                <div className={styles.modalBody}>
                                    {/* ---------- Người bị tố cáo ---------- */}
                                    <div className={styles.formRow}>
                                        <div className={styles.formCol}>
                                            <label className={styles.label}>
                                                {editing?.typeContent === 'account' ? 'Email bị tố cáo' : 'Email chủ nội dung'}
                                            </label>
                                            <input className={styles.input} value={editing?.violatorEmail || ''} disabled />
                                        </div>
                                        <div className={styles.formCol}>
                                            <label className={styles.label}>Tên</label>
                                            <input className={styles.input} value={editing?.violatorName || ''} disabled />
                                        </div>
                                    </div>

                                    {/* ---------- ID động ---------- */}
                                    {editing?.typeContent === 'post' && (
                                        <div className={styles.formRow}>
                                            <div className={styles.formCol}>
                                                <label className={styles.label}>ID bài viết</label>
                                                <input className={styles.input} value={editing.contentId || ''} disabled />
                                            </div>
                                        </div>
                                    )}

                                    {editing?.typeContent === 'comment' && (
                                        <div className={styles.formRow}>
                                            <div className={styles.formCol}>
                                                <label className={styles.label}>ID bình luận</label>
                                                <input className={styles.input} value={editing.contentId || ''} disabled />
                                            </div>
                                            <div className={styles.formCol}>
                                                <label className={styles.label}>Thuộc bài viết</label>
                                                <input className={styles.input} value={editing.contentParentId || ''} disabled />
                                            </div>
                                        </div>
                                    )}

                                    {editing?.typeContent === 'message' && (
                                        <div className={styles.formRow}>
                                            <div className={styles.formCol}>
                                                <label className={styles.label}>ID tin nhắn</label>
                                                <input className={styles.input} value={editing.contentId || ''} disabled />
                                            </div>
                                        </div>
                                    )}

                                    {/* ---------- Loại & Chính sách ---------- */}
                                    <div className={styles.formRow}>
                                        <div className={styles.formCol}>
                                            <label className={styles.label}>Loại nội dung</label>
                                            <input className={styles.input} value={editing ? TYPE_LABELS[editing.typeContent] : ''} disabled />
                                        </div>
                                        <div className={styles.formCol}>
                                            <label className={styles.label}>Chính sách vi phạm</label>
                                            <input className={styles.input} value={editing?.policyName || ''} disabled />
                                        </div>
                                    </div>

                                    {/* ---------- Nội dung tin nhắn (chỉ message) ---------- */}
                                    {editing?.typeContent === 'message' && (
                                        <div className={styles.formRow}>
                                            <div className={styles.formCol}>
                                                <label className={styles.label}>Nội dung tin nhắn</label>
                                                <input className={styles.input} value={editing.content || ''} disabled />
                                            </div>
                                        </div>
                                    )}

                                    {/* ---------- Nút Xem… ---------- */}
                                    {editing?.typeContent && editing.typeContent !== 'message' && (
                                        <div className={styles.formRow}>
                                            <div className={styles.formCol}>
                                                <button
                                                    className={styles.textBtn}
                                                    onClick={() => {
                                                        if (!editing) return;
                                                        if (editing.typeContent === 'account')
                                                            window.open(`/user/${editing.violatorEmail}`, '_blank');
                                                        if (editing.typeContent === 'post')
                                                            window.open(`/post/${editing.contentId}`, '_blank');
                                                        if (editing.typeContent === 'comment')
                                                            window.open(`/comment/${editing.contentId}`, '_blank');
                                                    }}
                                                >
                                                    {editing.typeContent === 'account'
                                                        ? 'Xem tài khoản bị tố cáo'
                                                        : editing.typeContent === 'post'
                                                            ? 'Xem bài viết'
                                                            : 'Xem bình luận'}
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {/* ---------- Lịch sử vi phạm ---------- */}
                                    <label className={styles.label}>
                                        Lịch sử vi phạm chính sách "{editing?.policyName}" của "{editing?.violatorEmail}"
                                    </label>
                                    <div className={styles.tableWrapper} style={{ marginTop: 8 }}>
                                        <table className={styles.table}>
                                            <thead>
                                                <tr>
                                                    <th>Số lần vi phạm</th>
                                                    <th>Thời gian</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {(editing?.violation?.length || 0) > 0 ? (
                                                    editing?.violation?.map((t, i) => (
                                                        <tr key={i}>
                                                            <td>{i + 1}</td>
                                                            <td>{new Date(t).toLocaleString('vi-VN')}</td>
                                                        </tr>
                                                    ))
                                                ) : (
                                                    <tr>
                                                        <td><b>0</b></td>
                                                        <td>Không có lịch sử vi phạm</td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>

                                    {/* ---------- Người tố cáo (bảng) ---------- */}
                                    <label className={styles.label}>Người tố cáo</label>
                                    <div className={styles.tableWrapper} style={{ marginTop: 8 }}>
                                        <table className={styles.table}>
                                            <thead>
                                                <tr>
                                                    <th>Email</th>
                                                    <th>Tên</th>
                                                    <th>Thời gian tố cáo</th>
                                                    <th className={styles.colDesc}>Mô tả</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {editing?.annunciator.map((a, idx) => (
                                                    <tr key={idx}>
                                                        <td>{a.annunciatorEmail}</td>
                                                        <td>{a.annunciatorName}</td>
                                                        <td>{new Date(a.reportedAt).toLocaleString('vi-VN')}</td>
                                                        <td>{a.description}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>

                                </div>

                                <div className={styles.modalFooter}>
                                    <button className={`${styles.textBtn} ${styles.confirm}`} onClick={handleReject}>
                                        Bỏ qua
                                    </button>
                                    <button className={`${styles.textBtn} ${styles.danger}`} onClick={handleApprove}>
                                        Phê duyệt
                                    </button>
                                    <button className={styles.textBtn} onClick={closeModal}>
                                        Đóng
                                    </button>
                                </div>
                            </Dialog.Panel>
                        </div>
                    </Transition.Child>
                </Dialog>
            </Transition>

            {/* ---------- toast ---------- */}
            {toast && (
                <div className={`${styles.toast} ${toast.ok ? styles.toastOk : styles.toastErr}`}>
                    {toast.msg}
                </div>
            )}
        </>
    );
};

export default ReportManager;