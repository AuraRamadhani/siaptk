'use client';
/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/set-state-in-effect -- bentuk respons API belum punya tipe bersama; ditandai untuk dirapikan bertahap. */

import React, { useState, useEffect, useRef } from "react";
import {
    X,
    FileText,
    Download,
    FolderOpen,
    User,
    Bell,
    CreditCard,
    Wallet,
    AlertTriangle,
    ArrowRight,
    ArrowLeft,
    ArrowDownLeft,
    ArrowUpRight,
    Image as ImageIcon,
    IdCard,
    LayoutDashboard,
    Users,
    FileText as FileTextIcon,
    Calendar,
    Clock,
    Eye,
    Plus,
    GraduationCap,
    CheckCircle2,
    Building2,
    ChevronDown,
    Trash2,
    AlertCircle,
    Info,
} from "lucide-react";
import logoSIAPTK from "../app/assets/siap-tk-logo.png";
import { tentukanKelompokDariTglLahir } from "@/lib/usia";
import { useToast } from "@/components/Toast";

interface ParentViewProps {
    childrenData: any[];
    activeChildId: string;
    setActiveChildId: (id: string) => void;
    onRegisterClick: () => void;
    onLogout: () => void;
    setCurrentView: (view: any) => void;
}

type SlotJadwalItem = {
    idSlot: string;
    tanggal: string;
    jam: string;
    kuota: number;
    sisa: number;
};

type BookingItem = {
    idBooking: string;
    status: string;
    jenisBooking: string;
    catatanOrangTua?: string;
    catatanBendahara?: string;
    slot: { idSlot: string; tanggal: string; jam: string };
};

type NotifikasiItem = {
    idNotifikasi: string;
    tipe: string;
    judul: string;
    pesan: string;
    dibaca: boolean;
    createdAt: string;
    dataReferensi?: string;
};

const keUrlBerkas = (file: string) => (file.startsWith("/") || file.startsWith("http") || file.startsWith("blob:") ? file : `/uploads/${file}`);
const formatTanggalSlot = (s: string) =>
    new Date(s).toLocaleDateString("id-ID", { weekday: "short", day: "2-digit", month: "short", year: "numeric" });
const formatJamSlot = (s: string) => (s.includes("T") ? s.slice(11, 16) : s.slice(0, 5));
const formatTanggalLengkap = (s: string) =>
    new Date(s).toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

const NAMA_BULAN: Record<number, string> = {
    1: "Januari",
    2: "Februari",
    3: "Maret",
    4: "April",
    5: "Mei",
    6: "Juni",
    7: "Juli",
    8: "Agustus",
    9: "September",
    10: "Oktober",
    11: "November",
    12: "Desember",
};

function buatInisial(nama: string): string {
    const kata = nama.trim().split(/\s+/).filter(Boolean);
    if (kata.length === 0) return "OT";
    if (kata.length === 1) return kata[0].slice(0, 2).toUpperCase();
    return `${kata[0][0]}${kata[1][0]}`.toUpperCase();
}

const InfoRekeningSekolah = () => (
    <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-2xl space-y-2.5 text-xs">
        <div className="flex items-center gap-1.5 font-bold text-emerald-900">
            <CreditCard className="w-4 h-4 text-[#095c51]" />
            <span>Tujuan Transfer Resmi (TK Islam Nur Habib):</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-slate-700">
            <div className="p-3 bg-white rounded-xl border border-emerald-100 shadow-xs">
                <div className="font-extrabold text-[#095c51]">Bank Syariah Indonesia (BSI)</div>
                <div className="font-mono font-bold text-sm text-slate-900 tracking-wider mt-0.5">7123-4567-89</div>
                <div className="text-[10px] text-slate-500">a.n. TK Islam Nur Habib</div>
            </div>
            <div className="p-3 bg-white rounded-xl border border-emerald-100 shadow-xs">
                <div className="font-extrabold text-[#095c51]">Bank Central Asia (BCA)</div>
                <div className="font-mono font-bold text-sm text-slate-900 tracking-wider mt-0.5">8876-5432-10</div>
                <div className="text-[10px] text-slate-500">a.n. Yayasan Nur Habib</div>
            </div>
            <div className="p-3 bg-white rounded-xl border border-emerald-100 shadow-xs">
                <div className="font-extrabold text-[#095c51]">Bank Mandiri</div>
                <div className="font-mono font-bold text-sm text-slate-900 tracking-wider mt-0.5">132-00-9876543-2</div>
                <div className="text-[10px] text-slate-500">a.n. TK Islam Nur Habib</div>
            </div>
        </div>
        <p className="text-[10px] text-emerald-700 italic">
            *Pastikan nominal transfer sesuai tagihan dan simpan bukti transfer (struk/screenshot) untuk diunggah di formulir ini.
        </p>
    </div>
);

export default function PortalOrangTua({
    activeChildId,
    setActiveChildId,
    onLogout,
}: ParentViewProps) {
    const { toast } = useToast();
    const [activeTab, setActiveTab] = useState<string>("overview");
    const [detailChildId, setDetailChildId] = useState<string | null>(null);
    const [familyChildren, setFamilyChildren] = useState<any[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [keluarga, setKeluarga] = useState<any>(null);

    // State untuk Preview Berkas (anak & keluarga)
    const [previewBerkas, setPreviewBerkas] = useState<{ label: string; url: string; isPdf?: boolean } | null>(null);

    // State untuk Modal Tambah Anak Baru & Berkas
    const [showAddChildModal, setShowAddChildModal] = useState<boolean>(false);
    const [modalStep, setModalStep] = useState<number>(1);
    const [namaAnak, setNamaAnak] = useState<string>("");
    const [tglLahirAnak, setTglLahirAnak] = useState<string>("");
    const [nikAnak, setNikAnak] = useState<string>("");
    const [jenisKelamin, setJenisKelamin] = useState<string>("Laki-laki");
    const [jalurPendaftaran, setJalurPendaftaran] = useState<string>("Daring");
    const [selectedOnsiteSlot, setSelectedOnsiteSlot] = useState<string>("");

    // State File Berkas Anak (wajib semua)
    const [fileAkta, setFileAkta] = useState<File | null>(null);
    const [fileFoto, setFileFoto] = useState<File | null>(null);
    const [fileKia, setFileKia] = useState<File | null>(null);

    // State untuk Modal Bayar Tagihan & Booking Kedatangan
    const [showPaymentModal, setShowPaymentModal] = useState<boolean>(false);
    const [paymentMode, setPaymentMode] = useState<"TRANSFER" | "LANGSUNG">("TRANSFER");
    const [selectedTagihan, setSelectedTagihan] = useState<string>("");
    const [buktiTransfer, setBuktiTransfer] = useState<File | null>(null);
    const [selectedPaySlot, setSelectedPaySlot] = useState<string>("");

    // State untuk Pembayaran Biaya Pendaftaran Calon Siswa (khusus menu Anak & Pendaftaran)
    const [showPendaftaranModal, setShowPendaftaranModal] = useState<boolean>(false);
    const [targetPendaftaranAnak, setTargetPendaftaranAnak] = useState<any>(null);
    const [modePendaftaranBayar, setModePendaftaranBayar] = useState<"TRANSFER" | "LANGSUNG">("TRANSFER");
    const [buktiPendaftaran, setBuktiPendaftaran] = useState<File | null>(null);
    const [slotPendaftaran, setSlotPendaftaran] = useState<string>("");

    // State Slot Kedatangan & Booking Orang Tua (untuk bayar langsung & onsite)
    const [slotList, setSlotList] = useState<SlotJadwalItem[]>([]);
    const [bookingList, setBookingList] = useState<BookingItem[]>([]);

    // State untuk Modal Setor Tabungan (terhubung ke Bendahara)
    const [showSetorModal, setShowSetorModal] = useState<boolean>(false);
    const [setorAnakId, setSetorAnakId] = useState<string>("");
    const [setorNominal, setSetorNominal] = useState<string>("");
    const [setorMetode, setSetorMetode] = useState<"TRANSFER" | "TUNAI">("TRANSFER");
    const [setorKeterangan, setSetorKeterangan] = useState<string>("");
    const [setorBukti, setSetorBukti] = useState<File | null>(null);
    const [setorSlotId, setSetorSlotId] = useState<string>("");

    // State untuk Modal Penarikan Tabungan
    const [showTarikModal, setShowTarikModal] = useState<boolean>(false);
    const [tarikAnakId, setTarikAnakId] = useState<string>("");
    const [tarikNominal, setTarikNominal] = useState<string>("");
    const [tarikKeterangan, setTarikKeterangan] = useState<string>("");

    // State untuk Notifikasi
    const [showNotifikasi, setShowNotifikasi] = useState<boolean>(false);
    const [notifikasiList, setNotifikasiList] = useState<NotifikasiItem[]>([]);
    const [unreadCount, setUnreadCount] = useState<number>(0);
    const notifikasiRef = useRef<HTMLDivElement>(null);

    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

    // Fetch notifikasi
    const fetchNotifikasi = async () => {
        try {
            const res = await fetch("/api/notifikasi").then((r) => r.json());
            if (res.success) {
                setNotifikasiList(res.data || []);
                setUnreadCount((res.data || []).filter((n: NotifikasiItem) => !n.dibaca).length);
            }
        } catch (err) {
            console.error("Gagal memuat notifikasi:", err);
        }
    };

    // Tandai notifikasi dibaca
    const markNotifRead = async (idNotifikasi?: string) => {
        try {
            await fetch("/api/notifikasi", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(idNotifikasi ? { idNotifikasi } : { semua: true }),
            }).then((r) => r.json());
            fetchNotifikasi();
        } catch (err) {
            console.error("Gagal tandai notifikasi:", err);
        }
    };

    // Tutup dropdown notifikasi saat klik di luar
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (notifikasiRef.current && !notifikasiRef.current.contains(e.target as Node)) {
                setShowNotifikasi(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const fetchSlotsAndBookings = async () => {
        try {
            const [sRes, bRes] = await Promise.all([
                fetch("/api/slot-jadwal?future=1").then((r) => r.json()),
                fetch("/api/booking-kunjungan").then((r) => r.json()),
            ]);
            if (sRes.success) setSlotList(sRes.data || []);
            if (bRes.success) setBookingList(bRes.data || []);
        } catch (err) {
            console.error("Gagal memuat slot kedatangan:", err);
        }
    };

    // Ambil data keluarga pemilik sesi dari database
    const fetchFamilyData = () => {
        fetch("/api/keluarga")
            .then((res) => res.json())
            .then((result) => {
                if (result.success && result.data) {
                    setKeluarga(result.data);
                    const daftarAnak = result.data.anak || [];

                    const formattedChildren = daftarAnak.map((ch: any) => {
                        const berkasObj = Array.isArray(ch.berkasAnak) ? ch.berkasAnak[0] : ch.berkasAnak;
                        const kelompokUsia = tentukanKelompokDariTglLahir(ch.tglLahir);
                        const namaKelompok = ch.riwayatKelompok?.[0]?.kelompok?.nama || kelompokUsia?.nama || "Belum Dikelompokkan";

                        const laporanDb = (ch.laporanMingguan || []).map((lap: any) => ({
                            id: lap.idLaporan,
                            tema: lap.tema?.namaTema || "Kegiatan Mingguan",
                            periode: lap.tema?.mingguKe ? `Minggu ke-${lap.tema.mingguKe} · Aspek: ${lap.aspek}` : lap.aspek,
                            isi: lap.catatanKegiatan,
                            dokumentasi: [lap.aspek],
                        }));

                        return {
                            id: String(ch.idAnak),
                            name: ch.nama,
                            nik: ch.nik,
                            gender: ch.jenisKelamin === "P" ? "Perempuan" : "Laki-laki",
                            group: namaKelompok,
                            birthDate: new Date(ch.tglLahir).toLocaleDateString("id-ID", {
                                day: "numeric",
                                month: "long",
                                year: "numeric",
                            }),
                            status: ch.status === "AKTIF" ? "Aktif" : "Pendaftar",
                            jalur: ch.jalurPendaftaran || "Daring",
                            deadlineBayar: ch.deadlineBayar ? new Date(ch.deadlineBayar).toLocaleDateString("id-ID") : null,
                            alasanPenolakan: ch.alasanPenolakan || null,
                            sppStatus: ch.tagihan?.some((t: any) => t.status === "BELUM_BAYAR")
                                ? "Belum Dibayar"
                                : ch.tagihan?.some((t: any) => t.status === "MENUNGGU_VERIFIKASI")
                                    ? "Menunggu Verifikasi"
                                    : ch.tagihan?.length > 0
                                        ? "Lunas"
                                        : "Belum Ada Tagihan",
                            savingsBalance: ch.rekeningTabungan ? Number(ch.rekeningTabungan.saldo) : 0,
                            tagihan: ch.tagihan || [],
                            berkasAnak: berkasObj || null,
                            tabunganMutasi: (ch.rekeningTabungan?.transaksi || []).map((t: any) => ({
                                id: t.idTransaksi,
                                ket:
                                    t.keterangan ||
                                    (t.jenis === "SETOR"
                                        ? `Setoran tabungan (${t.metode})`
                                        : t.jenis === "TARIK"
                                            ? "Penarikan tabungan"
                                            : "Pembayaran SPP"),
                                tgl: new Date(t.createdAt).toLocaleDateString("id-ID", {
                                    day: "2-digit",
                                    month: "short",
                                    year: "numeric",
                                }),
                                nominal: Number(t.nominal),
                                jenis: t.jenis,
                                status:
                                    t.status === "DIVERIFIKASI"
                                        ? "Selesai"
                                        : t.status === "MENUNGGU"
                                            ? "Menunggu Verifikasi"
                                            : "Ditolak",
                            })),
                            penarikanMutasi: (ch.rekeningTabungan?.penarikan || []).map((p: any) => ({
                                id: p.idPenarikan,
                                ket: p.keterangan || "Penarikan tabungan",
                                tgl: new Date(p.createdAt).toLocaleDateString("id-ID", {
                                    day: "2-digit",
                                    month: "short",
                                    year: "numeric",
                                }),
                                nominal: Number(p.nominal),
                                status:
                                    p.status === "DIVERIFIKASI"
                                        ? "Selesai"
                                        : p.status === "MENUNGGU"
                                            ? "Menunggu Verifikasi"
                                            : "Ditolak",
                                catatanPenolakan: p.catatanPenolakan,
                            })),
                            laporanMingguan: laporanDb,
                        };
                    });

                    setFamilyChildren(formattedChildren);
                    if (formattedChildren.length > 0) {
                        const stillExists = formattedChildren.some((c: any) => c.id === activeChildId);
                        if (!activeChildId || !stillExists) {
                            setActiveChildId(formattedChildren[0].id);
                        }
                    }
                }
                setLoading(false);
            })
            .catch((err) => {
                console.error("Gagal memuat data dari database:", err);
                setLoading(false);
            });
    };

    useEffect(() => {
        fetchFamilyData();
        fetchNotifikasi();
        fetchSlotsAndBookings();
    }, []);

    // Perhitungan kelompok otomatis saat mendaftar anak berdasarkan tanggal lahir
    const infoKelompokCalon = tglLahirAnak ? tentukanKelompokDariTglLahir(tglLahirAnak) : null;

    const handleLanjutStep = () => {
        if (modalStep === 1) {
            if (!namaAnak.trim() || !tglLahirAnak || !nikAnak) {
                toast.warning("Mohon lengkapi Nama Anak, Tanggal Lahir, dan NIK!");
                return;
            }
            if (!/^\d{16}$/.test(nikAnak)) {
                toast.warning("NIK harus terdiri dari tepat 16 digit angka (tidak boleh kurang atau lebih).");
                return;
            }
            if (!infoKelompokCalon) {
                toast.warning("Usia anak harus berada pada rentang KB/TK (3–6 tahun per 1 Juli 2026).");
                return;
            }
            setModalStep(2);
            return;
        }
        if (modalStep === 2) {
            if (!fileAkta || !fileFoto || !fileKia) {
                toast.warning("Semua berkas anak wajib diisi: Akta Kelahiran, Pas Foto (3x4), dan KIA!");
                return;
            }
            setModalStep(3);
        }
    };

    // Simpan pendaftaran anak baru + berkas + slot kedatangan (jika Onsite)
    const handleSaveNewChild = async () => {
        if (!namaAnak.trim() || !tglLahirAnak || !/^\d{16}$/.test(nikAnak)) {
            toast.warning("Mohon pastikan data utama dan NIK 16 digit sudah benar!");
            return;
        }
        if (!fileAkta || !fileFoto || !fileKia) {
            toast.warning("Semua berkas anak wajib diunggah (Akta, Pas Foto, dan KIA)!");
            return;
        }
        if (jalurPendaftaran === "Onsite" && slotList.length > 0 && !selectedOnsiteSlot) {
            toast.warning("Silakan pilih slot waktu kedatangan ke sekolah untuk jalur Datang Langsung (Onsite).");
            return;
        }

        setIsSubmitting(true);
        try {
            const formData = new FormData();
            formData.append("action", "add_child");
            formData.append("namaAnak", namaAnak.trim());
            formData.append("nikAnak", nikAnak);
            formData.append("tglLahirAnak", tglLahirAnak);
            formData.append("jenisKelamin", jenisKelamin);
            formData.append("jalurPendaftaran", jalurPendaftaran);
            formData.append("fileAkta", fileAkta);
            formData.append("fileFoto", fileFoto);
            formData.append("fileKia", fileKia);

            const response = await fetch("/api/keluarga", {
                method: "POST",
                body: formData,
            });
            const result = await response.json();

            if (!result.success) {
                toast.error(result.error || "Gagal menyimpan data anak.");
                return;
            }

            // Jika Onsite & memilih slot kedatangan, daftarkan booking slotnya
            if (jalurPendaftaran === "Onsite" && selectedOnsiteSlot) {
                await fetch("/api/booking-kunjungan", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ idSlot: selectedOnsiteSlot }),
                });
                fetchSlotsAndBookings();
            }

            toast.success("Berhasil mendaftarkan anak baru beserta berkas! Kelompok anak ditetapkan otomatis.");
            setShowAddChildModal(false);
            setNamaAnak("");
            setTglLahirAnak("");
            setNikAnak("");
            setFileAkta(null);
            setFileFoto(null);
            setFileKia(null);
            setSelectedOnsiteSlot("");
            setModalStep(1);
            fetchFamilyData();
        } catch (error) {
            console.error("Error submitting child:", error);
            toast.error("Terjadi kesalahan pada koneksi server.");
        } finally {
            setIsSubmitting(false);
        }
    };

    // Upload/ganti berkas keluarga (KK / KTP)
    const handleUploadBerkasKeluarga = async (jenis: "KK" | "KTP_ORTU", file: File) => {
        const fd = new FormData();
        fd.append("action", "upload_berkas_keluarga");
        fd.append("jenis", jenis);
        fd.append("file", file);
        try {
            const res = await fetch("/api/keluarga", { method: "POST", body: fd }).then((r) => r.json());
            if (res.success) {
                toast.success(res.message || "Berkas keluarga berhasil diperbarui.");
                fetchFamilyData();
            } else {
                toast.error(res.error || "Gagal mengunggah berkas.");
            }
        } catch {
            toast.error("Terjadi kesalahan saat mengunggah berkas.");
        }
    };

    // Kirim bukti transfer tagihan atau booking kedatangan bayar langsung
    const handleKirimPembayaran = async () => {
        if (paymentMode === "TRANSFER") {
            if (!selectedTagihan) {
                toast.warning("Silakan pilih tagihan terlebih dahulu.");
                return;
            }
            if (!buktiTransfer) {
                toast.warning("Silakan unggah bukti transfer terlebih dahulu.");
                return;
            }
            setIsSubmitting(true);
            try {
                const fd = new FormData();
                fd.append("metode", "TRANSFER");
                fd.append("buktiTransfer", buktiTransfer);
                const res = await fetch(`/api/tagihan/${selectedTagihan}/bayar`, {
                    method: "POST",
                    body: fd,
                }).then((r) => r.json());
                if (res.success) {
                    toast.success("Bukti pembayaran berhasil dikirim! Menunggu verifikasi bendahara.");
                    setShowPaymentModal(false);
                    setBuktiTransfer(null);
                    setSelectedTagihan("");
                    fetchFamilyData();
                    fetchNotifikasi();
                } else {
                    toast.error(res.error || "Gagal mengirim bukti pembayaran.");
                }
            } catch {
                toast.error("Gagal terhubung ke server.");
            } finally {
                setIsSubmitting(false);
            }
        } else {
            if (!selectedPaySlot) {
                toast.warning("Silakan pilih slot waktu kedatangan terlebih dahulu.");
                return;
            }
            setIsSubmitting(true);
            try {
                // Buat booking dengan jenis BAYAR_SPP
                const res = await fetch("/api/booking-kunjungan", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ idSlot: selectedPaySlot, jenisBooking: "BAYAR_SPP" }),
                }).then((r) => r.json());
                if (res.success) {
                    toast.success("Slot kedatangan untuk pembayaran langsung berhasil dipesan! Silakan datang ke Bendahara sesuai jadwal.");
                    setShowPaymentModal(false);
                    setSelectedPaySlot("");
                    fetchSlotsAndBookings();
                    fetchNotifikasi();
                } else {
                    toast.error(res.error || "Gagal memesan slot kedatangan.");
                }
            } catch {
                toast.error("Gagal terhubung ke server.");
            } finally {
                setIsSubmitting(false);
            }
        }
    };

    // Kirim pembayaran khusus biaya pendaftaran (Transfer / Onsite)
    const handleKirimPembayaranPendaftaran = async () => {
        if (!targetPendaftaranAnak) return;
        const tagihanPendaftaran = targetPendaftaranAnak.tagihan?.find((t: any) => t.jenis === "PENDAFTARAN");
        if (!tagihanPendaftaran) {
            toast.warning("Tagihan pendaftaran anak belum ditemukan.");
            return;
        }

        if (modePendaftaranBayar === "TRANSFER") {
            if (!buktiPendaftaran) {
                toast.warning("Silakan unggah bukti transfer pendaftaran terlebih dahulu.");
                return;
            }
            setIsSubmitting(true);
            try {
                const fd = new FormData();
                fd.append("metode", "TRANSFER");
                fd.append("buktiTransfer", buktiPendaftaran);
                const res = await fetch(`/api/tagihan/${tagihanPendaftaran.idTagihan}/bayar`, {
                    method: "POST",
                    body: fd,
                }).then((r) => r.json());
                if (res.success) {
                    toast.success("Bukti pembayaran pendaftaran berhasil dikirim! Menunggu verifikasi bendahara.");
                    setShowPendaftaranModal(false);
                    setBuktiPendaftaran(null);
                    setTargetPendaftaranAnak(null);
                    fetchFamilyData();
                    fetchNotifikasi();
                } else {
                    toast.error(res.error || "Gagal mengirim bukti pembayaran.");
                }
            } catch {
                toast.error("Gagal terhubung ke server.");
            } finally {
                setIsSubmitting(false);
            }
        } else {
            if (!slotPendaftaran) {
                toast.warning("Silakan pilih slot waktu kedatangan ke sekolah terlebih dahulu.");
                return;
            }
            setIsSubmitting(true);
            try {
                const res = await fetch("/api/booking-kunjungan", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ idSlot: slotPendaftaran, jenisBooking: "BAYAR_SPP" }),
                }).then((r) => r.json());
                if (res.success) {
                    toast.success("Slot kedatangan untuk pembayaran pendaftaran langsung berhasil dipesan! Silakan datang ke Bendahara sesuai jadwal.");
                    setShowPendaftaranModal(false);
                    setSlotPendaftaran("");
                    setTargetPendaftaranAnak(null);
                    fetchSlotsAndBookings();
                    fetchNotifikasi();
                } else {
                    toast.error(res.error || "Gagal memesan slot kedatangan.");
                }
            } catch {
                toast.error("Gagal terhubung ke server.");
            } finally {
                setIsSubmitting(false);
            }
        }
    };

    const handleBatalBooking = async (idBooking: string) => {
        if (!confirm("Batalkan jadwal kedatangan ini?")) return;
        const res = await fetch("/api/booking-kunjungan", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ idBooking, status: "DIBATALKAN" }),
        }).then((r) => r.json());
        if (res.success) {
            toast.info("Jadwal kedatangan dibatalkan.");
            fetchSlotsAndBookings();
            fetchNotifikasi();
        } else {
            toast.error(res.error || "Gagal membatalkan jadwal.");
        }
    };

    // Kirim setoran tabungan ke Bendahara
    const handleKirimSetorTabungan = async (e: React.FormEvent) => {
        e.preventDefault();
        const targetAnakId = setorAnakId || activeChild?.id;
        if (!targetAnakId) {
            toast.warning("Silakan pilih anak terlebih dahulu.");
            return;
        }
        const nilai = Number(setorNominal);
        if (!Number.isFinite(nilai) || nilai <= 0) {
            toast.warning("Nominal setoran harus lebih besar dari Rp 0.");
            return;
        }
        if (setorMetode === "TRANSFER" && !setorBukti) {
            toast.warning("Mohon unggah bukti transfer setoran tabungan.");
            return;
        }
        if (setorMetode === "TUNAI" && !setorSlotId) {
            toast.warning("Silakan pilih slot waktu kedatangan untuk setoran tunai.");
            return;
        }

        setIsSubmitting(true);
        try {
            const fd = new FormData();
            fd.append("idAnak", targetAnakId);
            fd.append("jenis", "SETOR");
            fd.append("metode", setorMetode);
            fd.append("nominal", String(nilai));
            fd.append(
                "keterangan",
                setorKeterangan.trim() ||
                    (setorMetode === "TRANSFER"
                        ? "Setoran tabungan via Transfer (menunggu verifikasi Bendahara)"
                        : "Setoran tabungan tunai (booking kedatangan)")
            );
            if (setorBukti) {
                fd.append("bukti", setorBukti);
            }
            if (setorSlotId) {
                fd.append("idBooking", setorSlotId);
            }

            const res = await fetch("/api/tabungan", {
                method: "POST",
                body: fd,
            }).then((r) => r.json());

            if (res.success) {
                toast.success(res.message || "Pengajuan setoran tabungan dikirim ke Bendahara!");
                setShowSetorModal(false);
                setSetorNominal("");
                setSetorKeterangan("");
                setSetorBukti(null);
                setSetorSlotId("");
                fetchFamilyData();
                fetchNotifikasi();
            } else {
                toast.error(res.error || "Gagal mengirim pengajuan setoran.");
            }
        } catch {
            toast.error("Terjadi kesalahan saat menghubungi server.");
        } finally {
            setIsSubmitting(false);
        }
    };

    // Kirim penarikan tabungan
    const handleKirimPenarikan = async (e: React.FormEvent) => {
        e.preventDefault();
        const targetAnakId = tarikAnakId || activeChild?.id;
        if (!targetAnakId) {
            toast.warning("Silakan pilih anak terlebih dahulu.");
            return;
        }
        const nilai = Number(tarikNominal);
        if (!Number.isFinite(nilai) || nilai <= 0) {
            toast.warning("Nominal penarikan harus lebih besar dari Rp 0.");
            return;
        }

        setIsSubmitting(true);
        try {
            const res = await fetch("/api/penarikan-tabungan", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    idAnak: targetAnakId,
                    nominal: nilai,
                    keterangan: tarikKeterangan.trim() || "Penarikan tabungan oleh orang tua",
                }),
            }).then((r) => r.json());

            if (res.success) {
                toast.success("Pengajuan penarikan tabungan dikirim ke Bendahara untuk verifikasi!");
                setShowTarikModal(false);
                setTarikNominal("");
                setTarikKeterangan("");
                fetchFamilyData();
                fetchNotifikasi();
            } else {
                toast.error(res.error || "Gagal mengirim pengajuan penarikan.");
            }
        } catch {
            toast.error("Terjadi kesalahan saat menghubungi server.");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-600 text-sm font-bold">
                Memuat data dari database SIAP TK...
            </div>
        );
    }

    const activeChild = familyChildren.find((c) => c.id === activeChildId) || familyChildren[0] || {
        id: "",
        name: "Belum ada data",
        group: "-",
        savingsBalance: 0,
        tabunganMutasi: [],
        penarikanMutasi: [],
        laporanMingguan: [],
    };

    // Nama orang tua sesuai data pendaftar
    const namaLengkapOrtu = keluarga
        ? [keluarga.namaAyah, keluarga.namaIbu].filter(Boolean).join(" & ") || "Orang Tua"
        : "Orang Tua";
    const namaSapaan = keluarga?.namaIbu || keluarga?.namaAyah || "Orang Tua";
    const inisialOrtu = buatInisial(keluarga?.namaAyah || keluarga?.namaIbu || "Orang Tua");

    // Berkas keluarga dari tabel BerkasKeluarga (dengan fallback kolom fileKK/fileKTP)
    const berkasKKRow = keluarga?.berkasKeluarga?.find((b: any) => b.jenis === "KK");
    const berkasKTPRow = keluarga?.berkasKeluarga?.find((b: any) => b.jenis === "KTP_ORTU");
    const fileKKName = berkasKKRow?.file || keluarga?.fileKK || null;
    const fileKTPName = berkasKTPRow?.file || keluarga?.fileKTP || null;

    const previewFileLokal = (label: string, file: File) => {
        const url = URL.createObjectURL(file);
        setPreviewBerkas({ label, url, isPdf: file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf") });
    };

    const getNotifIcon = (tipe: string) => {
        switch (tipe) {
            case 'PEMBAYARAN_DIVERIFIKASI':
            case 'SETORAN_DIVERIFIKASI':
            case 'PENARIKAN_DIVERIFIKASI':
            case 'ANAK_DITERIMA':
                return <CheckCircle2 className="w-4 h-4 text-emerald-600" />;
            case 'PEMBAYARAN_DITOLAK':
            case 'SETORAN_DITOLAK':
            case 'PENARIKAN_DITOLAK':
            case 'ANAK_DITOLAK':
                return <AlertCircle className="w-4 h-4 text-rose-600" />;
            case 'BOOKING_DIKONFIRMASI':
            case 'BOOKING_DIBATALKAN':
                return <Calendar className="w-4 h-4 text-amber-600" />;
            case 'DEADLINE_PEMBAYARAN':
                return <AlertTriangle className="w-4 h-4 text-orange-600" />;
            default:
                return <Info className="w-4 h-4 text-blue-600" />;
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 font-sans text-slate-800 antialiased flex flex-col w-full relative">
            {/* Topbar Utama */}
            <header className="sticky top-0 z-40 bg-[#095c51] text-white shadow-md w-full">
                <div className="w-full px-6 md:px-12 h-20 flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                        <img
                            src={logoSIAPTK.src}
                            alt="Logo SIAP TK"
                            className="w-11 h-11 object-contain rounded-xl bg-white p-1 shadow-sm"
                        />
                        <div>
                            <span className="font-bold text-lg text-white tracking-wide">SIAP TK</span>
                            <p className="text-xs text-teal-200">TK Islam Nur Habib</p>
                        </div>
                    </div>

                    <div className="flex items-center space-x-4">
                        <div className="bg-white text-slate-800 px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center space-x-2 shadow-xs">
                            <span className="w-6 h-6 rounded-full bg-teal-100 text-[#095c51] flex items-center justify-center">
                                <User className="w-3.5 h-3.5" />
                            </span>
                            <span className="hidden sm:inline">Orang Tua / Wali</span>
                        </div>

                        {/* Notifikasi Dropdown */}
                        <div className="relative" ref={notifikasiRef}>
                            <button
                                onClick={() => { setShowNotifikasi(!showNotifikasi); fetchNotifikasi(); }}
                                aria-label="Pemberitahuan"
                                className="w-10 h-10 rounded-xl bg-teal-800/80 hover:bg-teal-700 flex items-center justify-center text-white transition cursor-pointer relative shadow-xs"
                            >
                                <Bell className="w-5 h-5" />
                                {unreadCount > 0 && (
                                    <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-amber-400 rounded-full text-[10px] font-bold flex items-center justify-center text-white">
                                        {unreadCount > 9 ? "9+" : unreadCount}
                                    </span>
                                )}
                            </button>

                            {showNotifikasi && (
                                <div className="absolute right-0 top-full mt-2 w-96 md:w-[380px] bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden z-50">
                                    <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                                        <h3 className="text-sm font-bold text-slate-900">Pemberitahuan</h3>
                                        <button
                                            onClick={() => markNotifRead()}
                                            className="text-xs text-[#095c51] font-semibold hover:underline"
                                        >
                                            Tandai semua dibaca
                                        </button>
                                    </div>
                                    <div className="max-h-[400px] overflow-y-auto">
                                        {notifikasiList.length === 0 ? (
                                            <div className="p-6 text-center text-xs text-slate-400">Tidak ada pemberitahuan</div>
                                        ) : (
                                            notifikasiList.map((notif) => (
                                                <div
                                                    key={notif.idNotifikasi}
                                                    className={`p-4 border-b border-slate-100 hover:bg-slate-50 cursor-pointer transition ${!notif.dibaca ? 'bg-blue-50/50' : ''}`}
                                                    onClick={() => !notif.dibaca && markNotifRead(notif.idNotifikasi)}
                                                >
                                                    <div className="flex items-start gap-3">
                                                        <div className="flex-shrink-0 mt-0.5">{getNotifIcon(notif.tipe)}</div>
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center justify-between">
                                                                <p className={`text-xs font-semibold ${!notif.dibaca ? 'text-slate-900' : 'text-slate-700'}`}>{notif.judul}</p>
                                                                <span className="text-[10px] text-slate-400">
                                                                    {new Date(notif.createdAt).toLocaleString('id-ID', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                                                </span>
                                                            </div>
                                                            <p className={`text-xs mt-1 ${!notif.dibaca ? 'text-slate-700' : 'text-slate-500'}`}>{notif.pesan}</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        <button
                            onClick={onLogout}
                            className="text-xs px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white transition cursor-pointer font-bold shadow-sm"
                        >
                            Keluar
                        </button>
                    </div>
                </div>
            </header>

            {/* Layout Utama */}
            <div className="flex-1 flex w-full px-6 md:px-12 py-8 gap-8">
                {/* Sidebar Kiri */}
                <aside className="w-72 shrink-0 hidden md:flex flex-col bg-white rounded-3xl border border-slate-200 shadow-xs p-5 space-y-1.5 h-fit">
                    <div className="p-2 mb-2 border-b border-slate-100 pb-3 flex items-center space-x-2.5">
                        <div className="w-8 h-8 rounded-xl bg-teal-50 text-[#095c51] flex items-center justify-center shrink-0">
                            <GraduationCap className="w-4 h-4" />
                        </div>
                        <div>
                            <div className="text-xs font-bold uppercase tracking-wider text-[#095c51]">
                                MENU PORTAL
                            </div>
                            <p className="text-[11px] text-slate-400">SIAP TK Nur Habib</p>
                        </div>
                    </div>

                    <button
                        onClick={() => setActiveTab("overview")}
                        className={`w-full flex items-center space-x-3 px-4 py-3 rounded-2xl text-xs font-medium transition cursor-pointer ${
                            activeTab === "overview"
                                ? "bg-teal-50 text-[#095c51] font-bold border-l-4 border-[#095c51]"
                                : "text-slate-600 hover:bg-slate-50"
                        }`}
                    >
                        <LayoutDashboard className="w-4 h-4 shrink-0" />
                        <span>Ringkasan</span>
                    </button>

                    <button
                        onClick={() => setActiveTab("children")}
                        className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl text-xs font-medium transition cursor-pointer ${
                            activeTab === "children" || activeTab === "child_detail"
                                ? "bg-teal-50 text-[#095c51] font-bold border-l-4 border-[#095c51]"
                                : "text-slate-600 hover:bg-slate-50"
                        }`}
                    >
                        <span className="flex items-center space-x-3">
                            <Users className="w-4 h-4 shrink-0" />
                            <span>Anak & Pendaftaran</span>
                        </span>
                        <span className="px-2 py-0.5 text-[10px] bg-teal-100 text-[#095c51] rounded-full font-bold">
                            {familyChildren.length}
                        </span>
                    </button>

                    <button
                        onClick={() => setActiveTab("payments")}
                        className={`w-full flex items-center space-x-3 px-4 py-3 rounded-2xl text-xs font-medium transition cursor-pointer ${
                            activeTab === "payments"
                                ? "bg-teal-50 text-[#095c51] font-bold border-l-4 border-[#095c51]"
                                : "text-slate-600 hover:bg-slate-50"
                        }`}
                    >
                        <CreditCard className="w-4 h-4 shrink-0" />
                        <span>Tagihan SPP</span>
                    </button>

                    <button
                        onClick={() => setActiveTab("savings")}
                        className={`w-full flex items-center space-x-3 px-4 py-3 rounded-2xl text-xs font-medium transition cursor-pointer ${
                            activeTab === "savings"
                                ? "bg-teal-50 text-[#095c51] font-bold border-l-4 border-[#095c51]"
                                : "text-slate-600 hover:bg-slate-50"
                        }`}
                    >
                        <Wallet className="w-4 h-4 shrink-0" />
                        <span>Tabungan Siswa</span>
                    </button>

                    <button
                        onClick={() => setActiveTab("reports")}
                        className={`w-full flex items-center space-x-3 px-4 py-3 rounded-2xl text-xs font-medium transition cursor-pointer ${
                            activeTab === "reports"
                                ? "bg-teal-50 text-[#095c51] font-bold border-l-4 border-[#095c51]"
                                : "text-slate-600 hover:bg-slate-50"
                        }`}
                    >
                        <FileTextIcon className="w-4 h-4 shrink-0" />
                        <span>Laporan Mingguan</span>
                    </button>

                    <button
                        onClick={() => setActiveTab("family_files")}
                        className={`w-full flex items-center space-x-3 px-4 py-3 rounded-2xl text-xs font-medium transition cursor-pointer ${
                            activeTab === "family_files"
                                ? "bg-teal-50 text-[#095c51] font-bold border-l-4 border-[#095c51]"
                                : "text-slate-600 hover:bg-slate-50"
                        }`}
                    >
                        <FolderOpen className="w-4 h-4 shrink-0" />
                        <span>Berkas Keluarga</span>
                    </button>

                    {/* Footer Sidebar Card Keluarga */}
                    <div className="pt-4 mt-4 border-t border-slate-100">
                        <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 flex items-center space-x-3">
                            <div className="w-9 h-9 rounded-xl bg-[#095c51] text-white flex items-center justify-center font-bold text-xs shrink-0">
                                {inisialOrtu}
                            </div>
                            <div className="min-w-0">
                                <div className="text-xs font-bold text-slate-900 truncate">{namaLengkapOrtu}</div>
                                <div className="text-[10px] text-slate-500">{familyChildren.length} Anak Terdaftar</div>
                            </div>
                        </div>
                    </div>
                </aside>

                {/* Area Konten Utama Kanan */}
                <main className="flex-1 min-w-0 space-y-6">
                    {/* Navigasi Mobile */}
                    <div className="flex md:hidden gap-2 overflow-x-auto pb-2">
                        {[
                            { id: "overview", label: "Ringkasan", icon: LayoutDashboard },
                            { id: "children", label: "Anak", icon: Users },
                            { id: "payments", label: "Tagihan", icon: CreditCard },
                            { id: "savings", label: "Tabungan", icon: Wallet },
                            { id: "reports", label: "Laporan", icon: FileTextIcon },
                            { id: "family_files", label: "Berkas", icon: FolderOpen },
                        ].map((m) => {
                            const Icon = m.icon;
                            return (
                                <button
                                    key={m.id}
                                    onClick={() => setActiveTab(m.id)}
                                    className={`px-3.5 py-2 rounded-xl text-xs font-bold shrink-0 inline-flex items-center space-x-1.5 cursor-pointer ${
                                        activeTab === m.id
                                            ? "bg-[#095c51] text-white"
                                            : "bg-white border border-slate-200 text-slate-600"
                                    }`}
                                >
                                    <Icon className="w-3.5 h-3.5" />
                                    <span>{m.label}</span>
                                </button>
                            );
                        })}
                    </div>

                    {/* TAB: RINGKASAN */}
                    {activeTab === "overview" && (
                        <div className="space-y-6">
                            <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-xs flex justify-between items-center flex-wrap gap-4">
                                <div>
                                    <h1 className="text-2xl font-bold text-slate-900">Halo, {namaSapaan}</h1>
                                    <p className="text-xs text-slate-500 mt-1">
                                        Pilih anak untuk melihat ringkasan perkembangan dan keuangannya dari database.
                                    </p>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {familyChildren.map((child) => (
                                        <button
                                            key={child.id}
                                            onClick={() => setActiveChildId(child.id)}
                                            className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                                                activeChildId === child.id
                                                    ? "bg-[#095c51] text-white shadow-sm"
                                                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                                            }`}
                                        >
                                            {child.name} ({child.group})
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs">
                                    <div className="text-xs font-semibold text-slate-500">SPP Bulan Ini</div>
                                    <div className="text-2xl font-bold text-slate-900 mt-1.5">Rp135.000</div>
                                    <span className="inline-block mt-3 px-2.5 py-1 text-[10px] bg-emerald-100 text-emerald-800 rounded-md font-bold">
                                        {activeChild?.sppStatus || "Belum Dibayar"}
                                    </span>
                                </div>

                                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs">
                                    <div className="text-xs font-semibold text-slate-500">Saldo Tabungan Siswa</div>
                                    <div className="text-2xl font-bold text-slate-900 mt-1.5">
                                        Rp {Number(activeChild?.savingsBalance || 0).toLocaleString("id-ID")}
                                    </div>
                                    <div className="text-[11px] text-slate-400 mt-1.5">Tanpa biaya administrasi</div>
                                </div>

                                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs">
                                    <div className="text-xs font-semibold text-slate-500">Status Anak</div>
                                    <div className="text-2xl font-bold text-[#095c51] mt-1.5">
                                        {activeChild?.group || "-"}
                                    </div>
                                    <div className="text-[11px] text-slate-400 mt-1.5">Tahun ajaran 2026/2027</div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* TAB: ANAK & PENDAFTARAN */}
                    {activeTab === "children" && (
                        <div className="space-y-6">
                            <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                                <div>
                                    <h1 className="text-xl font-bold text-slate-900">Anak & Pendaftaran</h1>
                                    <p className="text-xs text-slate-500 mt-1">
                                        Kelola data anak, lihat preview berkas anak, dan tambah pendaftaran siswa baru.
                                    </p>
                                </div>
                                <button
                                    onClick={() => {
                                        setModalStep(1);
                                        setShowAddChildModal(true);
                                    }}
                                    className="px-5 py-3 bg-[#009688] hover:bg-[#00796b] text-white rounded-2xl font-bold text-xs transition shadow-sm flex items-center space-x-2 cursor-pointer"
                                >
                                    <Plus className="w-4 h-4" />
                                    <span>Tambah Anak Baru</span>
                                </button>
                            </div>

                            <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs overflow-x-auto">
                                <table className="w-full text-xs text-left">
                                    <thead>
                                        <tr className="border-b border-slate-100 text-slate-400 font-semibold bg-slate-50/30">
                                            <th className="p-5">NAMA LENGKAP ANAK</th>
                                            <th className="p-5">TANGGAL LAHIR</th>
                                            <th className="p-5">KELOMPOK</th>
                                            <th className="p-5">JALUR</th>
                                            <th className="p-5">STATUS SISWA</th>
                                            <th className="p-5">VERIFIKASI BERKAS</th>
                                            <th className="p-5">PEMBAYARAN PENDAFTARAN</th>
                                            <th className="p-5 text-right">AKSI</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 text-slate-700">
                                        {familyChildren.length === 0 ? (
                                            <tr>
                                                <td colSpan={8} className="p-6 text-center text-slate-400">
                                                    Belum ada anak terdaftar. Klik &quot;+ Tambah Anak Baru&quot; untuk mendaftar.
                                                </td>
                                            </tr>
                                        ) : (
                                            familyChildren.map((ch) => {
                                                const berkasObj = Array.isArray(ch.berkasAnak) ? ch.berkasAnak[0] : ch.berkasAnak;
                                                const statusBerkas = berkasObj?.statusVerifikasi || "MENUNGGU";
                                                const tagihanPendaftaran = (ch.tagihan || []).find((t: any) => t.jenis === "PENDAFTARAN");
                                                const nominalPendaftaran = tagihanPendaftaran
                                                    ? Number(tagihanPendaftaran.nominal) - Number(tagihanPendaftaran.diskon || 0)
                                                    : 1570000;

                                                return (
                                                <tr key={ch.id} className="hover:bg-slate-50/50 transition">
                                                    <td className="p-5 font-bold text-slate-900">
                                                        {ch.name}
                                                        <div className="text-[10px] font-normal text-slate-400 mt-0.5">
                                                            NIK: {ch.nik}
                                                        </div>
                                                    </td>
                                                    <td className="p-5 text-slate-500">{ch.birthDate}</td>
                                                    <td className="p-5">
                                                        <span className="px-3 py-1 bg-amber-100 text-amber-800 rounded-lg font-bold text-[10px]">
                                                            {ch.group}
                                                        </span>
                                                    </td>
                                                    <td className="p-5 text-slate-600">{ch.jalur}</td>
                                                    <td className="p-5">
                                                        <span className={`px-3 py-1 rounded-full font-bold text-[10px] ${
                                                            ch.status === "Aktif" ? "bg-emerald-100 text-emerald-800" :
                                                            ch.alasanPenolakan ? "bg-rose-100 text-rose-700" : "bg-amber-100 text-amber-800"
                                                        }`}>
                                                            {ch.status}
                                                            {ch.alasanPenolakan && " (Ditolak)"}
                                                        </span>
                                                    </td>
                                                    <td className="p-5">
                                                        <div className="space-y-1.5">
                                                            <div>
                                                                {statusBerkas === "DIVERIFIKASI" ? (
                                                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                                                                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                                                        <span>Disetujui Kepala Sekolah</span>
                                                                    </span>
                                                                ) : statusBerkas === "DITOLAK" ? (
                                                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-100 text-rose-700 font-bold text-[10px]">
                                                                        <AlertCircle className="w-3 h-3 text-rose-600" />
                                                                        <span>Ditolak Kepala Sekolah</span>
                                                                    </span>
                                                                ) : (
                                                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800 font-semibold text-[10px]">
                                                                        <Clock className="w-3 h-3 text-amber-600" />
                                                                        <span>Menunggu Verifikasi</span>
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <div className="flex flex-wrap gap-1">
                                                                {([
                                                                    { key: "akta", label: "Akta" },
                                                                    { key: "foto", label: "Foto" },
                                                                    { key: "kia", label: "KIA" },
                                                                ] as const).map((item) => {
                                                                    const fileVal = ch.berkasAnak?.[item.key];
                                                                    return fileVal ? (
                                                                        <button
                                                                            key={item.key}
                                                                            type="button"
                                                                            onClick={() =>
                                                                                setPreviewBerkas({
                                                                                    label: `${item.label} - ${ch.name}`,
                                                                                    url: keUrlBerkas(fileVal),
                                                                                    isPdf: String(fileVal).toLowerCase().endsWith(".pdf"),
                                                                                })
                                                                            }
                                                                            className="inline-flex items-center gap-1 px-2 py-0.5 bg-teal-50 text-[#095c51] hover:bg-teal-100 rounded-md font-semibold text-[9px] cursor-pointer transition"
                                                                        >
                                                                            <Eye className="w-2.5 h-2.5" />
                                                                            <span>{item.label}</span>
                                                                        </button>
                                                                    ) : (
                                                                        <span
                                                                            key={item.key}
                                                                            className="px-2 py-0.5 bg-slate-100 text-slate-400 rounded-md text-[9px]"
                                                                        >
                                                                            {item.label} —
                                                                        </span>
                                                                    );
                                                                })}
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="p-5">
                                                        {statusBerkas !== "DIVERIFIKASI" ? (
                                                            <div className="flex flex-col gap-1">
                                                                <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 font-semibold text-[10px] w-fit">
                                                                    Menunggu Verifikasi Berkas
                                                                </span>
                                                            </div>
                                                        ) : tagihanPendaftaran?.status === "LUNAS" ? (
                                                            <div className="flex flex-col gap-1">
                                                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px] w-fit">
                                                                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                                                    <span>Pendaftaran Lunas</span>
                                                                </span>
                                                                <span className="text-[11px] font-bold text-slate-700">
                                                                    Rp {nominalPendaftaran.toLocaleString("id-ID")}
                                                                </span>
                                                            </div>
                                                        ) : tagihanPendaftaran?.status === "MENUNGGU_VERIFIKASI" ? (
                                                            <div className="flex flex-col gap-1">
                                                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 font-bold text-[10px] w-fit">
                                                                    <Clock className="w-3 h-3 text-amber-600" />
                                                                    <span>Menunggu Verifikasi Bendahara</span>
                                                                </span>
                                                                {tagihanPendaftaran.pembayaran?.[0]?.buktiTransfer && (
                                                                    <button
                                                                        type="button"
                                                                        onClick={() =>
                                                                            setPreviewBerkas({
                                                                                label: `Bukti Pendaftaran - ${ch.name}`,
                                                                                url: keUrlBerkas(tagihanPendaftaran.pembayaran[0].buktiTransfer),
                                                                                isPdf: String(tagihanPendaftaran.pembayaran[0].buktiTransfer).toLowerCase().endsWith(".pdf"),
                                                                            })
                                                                        }
                                                                        className="text-[10px] text-[#095c51] font-semibold hover:underline text-left inline-flex items-center gap-1"
                                                                    >
                                                                        <Eye className="w-3 h-3" />
                                                                        <span>Lihat Bukti Transfer</span>
                                                                    </button>
                                                                )}
                                                            </div>
                                                        ) : (
                                                            <div className="flex flex-col gap-1.5">
                                                                <div className="font-extrabold text-slate-900 text-xs">
                                                                    Rp {nominalPendaftaran.toLocaleString("id-ID")}
                                                                </div>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        setTargetPendaftaranAnak(ch);
                                                                        setModePendaftaranBayar("TRANSFER");
                                                                        setShowPendaftaranModal(true);
                                                                    }}
                                                                    className="px-3 py-1.5 bg-[#fbbf24] hover:bg-[#f59e0b] text-slate-900 rounded-xl font-bold text-[11px] transition shadow-xs flex items-center justify-center gap-1.5 cursor-pointer w-fit"
                                                                >
                                                                    <CreditCard className="w-3.5 h-3.5" />
                                                                    <span>Bayar Pendaftaran</span>
                                                                </button>
                                                                {ch.deadlineBayar && (
                                                                    <span className="text-[10px] text-amber-700">Deadline: {ch.deadlineBayar}</span>
                                                                )}
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td className="p-5 text-right">
                                                        <button
                                                            onClick={() => {
                                                                setActiveChildId(ch.id);
                                                                setDetailChildId(ch.id);
                                                                setActiveTab("child_detail");
                                                                window.scrollTo({ top: 0, behavior: "smooth" });
                                                            }}
                                                            className="px-4 py-2 rounded-xl font-semibold text-[11px] transition cursor-pointer bg-[#095c51] hover:bg-[#074840] text-white"
                                                        >
                                                            Pilih
                                                        </button>
                                                    </td>
                                                </tr>
                                                );
                                            })
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* HALAMAN TERPISAH: DETAIL ANAK (TAMPILAN RAPOT & BERKAS) */}
                    {activeTab === "child_detail" && (() => {
                        const detailChild = familyChildren.find((c) => c.id === (detailChildId || activeChildId)) || familyChildren[0];
                        if (!detailChild) {
                            return (
                                <div className="bg-white p-8 rounded-3xl border border-slate-200 text-center space-y-4">
                                    <p className="text-xs text-slate-500">Data anak tidak ditemukan.</p>
                                    <button
                                        onClick={() => setActiveTab("children")}
                                        className="px-4 py-2 bg-[#095c51] text-white rounded-xl text-xs font-bold cursor-pointer inline-flex items-center gap-1.5"
                                    >
                                        <ArrowLeft className="w-4 h-4" />
                                        <span>Kembali ke Anak & Pendaftaran</span>
                                    </button>
                                </div>
                            );
                        }

                        const fotoFile = detailChild.berkasAnak?.foto;
                        const fotoUrl = fotoFile ? keUrlBerkas(fotoFile) : null;
                        const totalTunggakan = (detailChild.tagihan || [])
                            .filter((t: any) => t.status === "BELUM_BAYAR")
                            .reduce(
                                (sum: number, t: any) => sum + (Number(t.nominal) - Number(t.diskon || 0)),
                                0
                            );

                        const detailBerkasObj = Array.isArray(detailChild.berkasAnak) ? detailChild.berkasAnak[0] : detailChild.berkasAnak;
                        const detailStatusBerkas = detailBerkasObj?.statusVerifikasi || "MENUNGGU";
                        const detailTagihanPendaftaran = (detailChild.tagihan || []).find((t: any) => t.jenis === "PENDAFTARAN");
                        const detailNominalPendaftaran = detailTagihanPendaftaran
                            ? Number(detailTagihanPendaftaran.nominal) - Number(detailTagihanPendaftaran.diskon || 0)
                            : 1570000;

                        const daftarBerkasAnak = [
                            { key: "akta", label: "Akta Kelahiran", file: detailChild.berkasAnak?.akta },
                            { key: "foto", label: "Pas Foto (3x4)", file: detailChild.berkasAnak?.foto },
                            { key: "kia", label: "Kartu Identitas Anak (KIA)", file: detailChild.berkasAnak?.kia },
                        ] as const;

                        return (
                            <div className="space-y-6">
                                <div className="flex items-center justify-between">
                                    <button
                                        type="button"
                                        onClick={() => setActiveTab("children")}
                                        className="px-4 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold cursor-pointer inline-flex items-center gap-2 shadow-xs"
                                    >
                                        <ArrowLeft className="w-4 h-4 text-[#095c51]" />
                                        <span>Kembali ke Daftar Anak</span>
                                    </button>
                                </div>

                                <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                                    {/* Header Rapot / CV */}
                                    <div className="bg-[#095c51] text-white px-8 py-5 text-center">
                                        <div className="text-[11px] uppercase tracking-widest text-teal-100 font-bold">
                                            TK ISLAM NUR HABIB · PROFIL & RAPOT PESERTA DIDIK
                                        </div>
                                    </div>

                                    {/* Foto di atas seperti CV */}
                                    <div className="px-8 pt-8 pb-7 flex flex-col items-center text-center border-b border-slate-100">
                                        <div className="w-28 h-36 rounded-2xl border-2 border-slate-200 shadow-md bg-slate-100 overflow-hidden flex items-center justify-center">
                                            {fotoUrl ? (
                                                <img
                                                    src={fotoUrl}
                                                    alt={`Pas Foto ${detailChild.name}`}
                                                    className="w-full h-full object-cover"
                                                />
                                            ) : (
                                                <User className="w-12 h-12 text-slate-400" />
                                            )}
                                        </div>
                                        <h2 className="text-xl font-extrabold text-slate-900 mt-4">
                                            {detailChild.name}
                                        </h2>
                                        <div className="flex flex-wrap items-center justify-center gap-2 mt-2">
                                            <span className="px-3 py-1 bg-amber-100 text-amber-800 rounded-full text-xs font-bold">
                                                {detailChild.group}
                                            </span>
                                            <span className="px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full text-xs font-bold">
                                                Status: {detailChild.status}
                                            </span>
                                            <span className="px-3 py-1 bg-slate-100 text-slate-700 rounded-full text-xs font-semibold">
                                                Jalur {detailChild.jalur}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Isi Detail Rapih ala Rapot */}
                                    <div className="p-8 space-y-6">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="rounded-2xl border border-slate-200 p-5 bg-slate-50/50 space-y-3">
                                                <h3 className="text-xs font-bold uppercase tracking-wider text-[#095c51] border-b border-slate-200 pb-2">
                                                    Identitas Siswa
                                                </h3>
                                                <dl className="space-y-2 text-xs">
                                                    <div className="flex justify-between gap-4">
                                                        <dt className="text-slate-500">Nama Lengkap</dt>
                                                        <dd className="font-bold text-slate-900 text-right">{detailChild.name}</dd>
                                                    </div>
                                                    <div className="flex justify-between gap-4">
                                                        <dt className="text-slate-500">NIK</dt>
                                                        <dd className="font-semibold text-slate-800 text-right">{detailChild.nik}</dd>
                                                    </div>
                                                    <div className="flex justify-between gap-4">
                                                        <dt className="text-slate-500">Tanggal Lahir</dt>
                                                        <dd className="font-semibold text-slate-800 text-right">{detailChild.birthDate}</dd>
                                                    </div>
                                                    <div className="flex justify-between gap-4">
                                                        <dt className="text-slate-500">Jenis Kelamin</dt>
                                                        <dd className="font-semibold text-slate-800 text-right">{detailChild.gender}</dd>
                                                    </div>
                                                    <div className="flex justify-between gap-4">
                                                        <dt className="text-slate-500">Orang Tua / Wali</dt>
                                                        <dd className="font-semibold text-slate-800 text-right">{namaLengkapOrtu}</dd>
                                                    </div>
                                                </dl>
                                            </div>

                                            <div className="rounded-2xl border border-slate-200 p-5 bg-slate-50/50 space-y-3">
                                                <h3 className="text-xs font-bold uppercase tracking-wider text-[#095c51] border-b border-slate-200 pb-2">
                                                    Akademik & Keuangan
                                                </h3>
                                                <dl className="space-y-2 text-xs">
                                                    <div className="flex justify-between gap-4">
                                                        <dt className="text-slate-500">Kelompok Kelas</dt>
                                                        <dd className="font-bold text-[#095c51] text-right">{detailChild.group}</dd>
                                                    </div>
                                                    <div className="flex justify-between gap-4">
                                                        <dt className="text-slate-500">Jalur Pendaftaran</dt>
                                                        <dd className="font-semibold text-slate-800 text-right">{detailChild.jalur}</dd>
                                                    </div>
                                                    <div className="flex justify-between items-center gap-4">
                                                        <dt className="text-slate-500">Verifikasi Berkas</dt>
                                                        <dd className="font-bold text-right">
                                                            {detailStatusBerkas === "DIVERIFIKASI" ? (
                                                                <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px]">
                                                                    Disetujui Kepala Sekolah
                                                                </span>
                                                            ) : detailStatusBerkas === "DITOLAK" ? (
                                                                <span className="px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-700 text-[10px]">
                                                                    Ditolak Kepala Sekolah
                                                                </span>
                                                            ) : (
                                                                <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px]">
                                                                    Menunggu Verifikasi
                                                                </span>
                                                            )}
                                                        </dd>
                                                    </div>
                                                    <div className="flex justify-between items-center gap-4">
                                                        <dt className="text-slate-500">Biaya Pendaftaran</dt>
                                                        <dd className="text-right">
                                                            {detailStatusBerkas !== "DIVERIFIKASI" ? (
                                                                <span className="text-slate-500 font-medium text-[11px]">
                                                                    Menunggu Verifikasi Berkas
                                                                </span>
                                                            ) : detailTagihanPendaftaran?.status === "LUNAS" ? (
                                                                <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                                                                    Lunas (Rp {detailNominalPendaftaran.toLocaleString("id-ID")})
                                                                </span>
                                                            ) : detailTagihanPendaftaran?.status === "MENUNGGU_VERIFIKASI" ? (
                                                                <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold text-[10px]">
                                                                    Menunggu Verifikasi Bendahara
                                                                </span>
                                                            ) : (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        setTargetPendaftaranAnak(detailChild);
                                                                        setModePendaftaranBayar("TRANSFER");
                                                                        setShowPendaftaranModal(true);
                                                                    }}
                                                                    className="px-3 py-1 bg-[#fbbf24] hover:bg-[#f59e0b] text-slate-900 rounded-lg font-bold text-[10px] transition cursor-pointer"
                                                                >
                                                                    Bayar Pendaftaran (Rp {detailNominalPendaftaran.toLocaleString("id-ID")})
                                                                </button>
                                                            )}
                                                        </dd>
                                                    </div>
                                                    <div className="flex justify-between items-center gap-4">
                                                        <dt className="text-slate-500">Status SPP Bulanan</dt>
                                                        <dd className="font-bold text-slate-800 text-right">
                                                            {detailChild.status === "Pendaftar" ? (
                                                                <span className="text-slate-400 font-normal text-[11px]">
                                                                    Aktif setelah pendaftaran lunas
                                                                </span>
                                                            ) : (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setActiveTab("payments")}
                                                                    className="text-[#095c51] hover:underline text-[11px] font-bold cursor-pointer"
                                                                >
                                                                    Lihat Tagihan SPP →
                                                                </button>
                                                            )}
                                                        </dd>
                                                    </div>
                                                    <div className="flex justify-between gap-4">
                                                        <dt className="text-slate-500">Saldo Tabungan</dt>
                                                        <dd className="font-bold text-slate-900 text-right">
                                                            Rp {Number(detailChild.savingsBalance || 0).toLocaleString("id-ID")}
                                                        </dd>
                                                    </div>
                                                </dl>
                                            </div>
                                        </div>

                                        {/* Berkas Anak (Langsung Bisa Dilihat di Halaman Detail) */}
                                        <div className="rounded-2xl border border-slate-200 p-5 space-y-4">
                                            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                                                <h3 className="text-xs font-bold uppercase tracking-wider text-[#095c51]">
                                                    Berkas Anak Terdaftar
                                                </h3>
                                                <span className="text-[11px] text-slate-400">
                                                    Klik Lihat Berkas untuk membuka lampiran
                                                </span>
                                            </div>
                                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                                {daftarBerkasAnak.map((b) => {
                                                    const url = b.file ? keUrlBerkas(b.file) : null;
                                                    const isPdf = Boolean(b.file && String(b.file).toLowerCase().endsWith(".pdf"));
                                                    return (
                                                        <div
                                                            key={b.key}
                                                            className="p-4 rounded-2xl border border-slate-200 bg-slate-50/70 flex flex-col justify-between gap-3"
                                                        >
                                                            <div className="space-y-2">
                                                                <div className="flex items-center justify-between">
                                                                    <span className="text-xs font-bold text-slate-900">{b.label}</span>
                                                                    <span
                                                                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                                                            url
                                                                                ? "bg-emerald-100 text-emerald-800"
                                                                                : "bg-slate-200 text-slate-500"
                                                                        }`}
                                                                    >
                                                                        {url ? "Ada" : "Kosong"}
                                                                    </span>
                                                                </div>
                                                                {url && !isPdf && (
                                                                    <div className="h-28 rounded-xl overflow-hidden border border-slate-200 bg-white flex items-center justify-center">
                                                                        <img
                                                                            src={url}
                                                                            alt={`${b.label} ${detailChild.name}`}
                                                                            className="w-full h-full object-cover"
                                                                        />
                                                                    </div>
                                                                )}
                                                                {url && isPdf && (
                                                                    <div className="h-28 rounded-xl border border-slate-200 bg-white flex flex-col items-center justify-center text-slate-500 gap-1">
                                                                        <FileText className="w-7 h-7 text-[#095c51]" />
                                                                        <span className="text-[10px] font-semibold">Dokumen PDF</span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                            {url ? (
                                                                <button
                                                                    type="button"
                                                                    onClick={() =>
                                                                        setPreviewBerkas({
                                                                            label: `${b.label} - ${detailChild.name}`,
                                                                            url,
                                                                            isPdf,
                                                                        })
                                                                    }
                                                                    className="w-full px-3 py-2 rounded-xl bg-[#095c51] hover:bg-[#074840] text-white text-xs font-bold cursor-pointer inline-flex items-center justify-center gap-1.5"
                                                                >
                                                                    <Eye className="w-3.5 h-3.5" />
                                                                    <span>Lihat Berkas</span>
                                                                </button>
                                                            ) : (
                                                                <div className="text-[11px] text-slate-400 text-center py-1">
                                                                    Belum diunggah
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>

                                        {/* Ringkasan Laporan Perkembangan Mingguan */}
                                        <div className="rounded-2xl border border-slate-200 p-5 space-y-3">
                                            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                                                <h3 className="text-xs font-bold uppercase tracking-wider text-[#095c51]">
                                                    Catatan Perkembangan Mingguan
                                                </h3>
                                                <span className="text-[11px] text-slate-400">
                                                    {detailChild.laporanMingguan?.length || 0} Catatan
                                                </span>
                                            </div>
                                            {!detailChild.laporanMingguan || detailChild.laporanMingguan.length === 0 ? (
                                                <p className="text-xs text-slate-400">
                                                    Belum ada catatan laporan mingguan dari guru kelas.
                                                </p>
                                            ) : (
                                                <div className="space-y-2.5">
                                                    {detailChild.laporanMingguan.slice(0, 3).map((lap: any, idx: number) => (
                                                        <div
                                                            key={lap.id || idx}
                                                            className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 text-xs space-y-1"
                                                        >
                                                            <div className="flex justify-between items-center">
                                                                <span className="font-bold text-slate-900">{lap.tema}</span>
                                                                <span className="text-[10px] text-slate-500 font-semibold">
                                                                    {lap.periode}
                                                                </span>
                                                            </div>
                                                            <p className="text-slate-600 leading-relaxed">{lap.isi}</p>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })()}

                    {/* TAB: TAGIHAN SPP */}
                    {activeTab === "payments" && (() => {
                        const sppList = familyChildren.flatMap((child) =>
                            (child.tagihan || [])
                                .filter((t: any) => t.jenis === "SPP")
                                .map((t: any) => ({ ...t, childName: child.name }))
                        );

                        return (
                        <div className="space-y-6">
                            <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                                <div>
                                    <h1 className="text-xl font-bold text-slate-900">Tagihan SPP Bulanan</h1>
                                    <p className="text-xs text-slate-500 mt-1">
                                        Tagihan SPP bulanan untuk siswa aktif. Bayar via Transfer Bank atau pilih slot jadwal bayar langsung di sekolah.
                                    </p>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    <button
                                        onClick={() => {
                                            setPaymentMode("TRANSFER");
                                            setShowPaymentModal(true);
                                        }}
                                        className="px-5 py-3 bg-[#009688] hover:bg-[#00796b] text-white rounded-2xl font-bold text-xs transition shadow-sm cursor-pointer flex items-center space-x-2"
                                    >
                                        <CreditCard className="w-4 h-4" />
                                        <span>Bayar SPP / Unggah Bukti</span>
                                    </button>
                                    <button
                                        onClick={() => {
                                            setPaymentMode("LANGSUNG");
                                            setShowPaymentModal(true);
                                        }}
                                        className="px-5 py-3 bg-amber-400 hover:bg-amber-500 text-slate-900 rounded-2xl font-bold text-xs transition shadow-sm cursor-pointer flex items-center space-x-2"
                                    >
                                        <Calendar className="w-4 h-4" />
                                        <span>Booking Kedatangan Bayar SPP</span>
                                    </button>
                                </div>
                            </div>

                            {/* Info Rekening Resmi Pembayaran */}
                            <InfoRekeningSekolah />

                            {/* Daftar Tagihan SPP */}
                            <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs overflow-x-auto">
                                <table className="w-full text-xs text-left">
                                    <thead>
                                        <tr className="border-b border-slate-100 text-slate-400 font-semibold bg-slate-50/50">
                                            <th className="p-5">ANAK</th>
                                            <th className="p-5">BULAN SPP</th>
                                            <th className="p-5">NOMINAL</th>
                                            <th className="p-5">STATUS</th>
                                            <th className="p-5">METODE</th>
                                            <th className="p-5">CATATAN</th>
                                            <th className="p-5 text-right">AKSI</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 text-slate-700">
                                        {sppList.length === 0 ? (
                                            <tr>
                                                <td colSpan={7} className="p-8 text-center text-slate-400">
                                                    Belum ada tagihan SPP bulanan. Tagihan SPP bulanan diterbitkan setiap bulan untuk siswa aktif.
                                                </td>
                                            </tr>
                                        ) : (
                                            sppList.map((t: any) => {
                                                const nominalAsli = Number(t.nominal || 0);
                                                const diskon = Number(t.diskon || 0);
                                                const totalBayar = Math.max(0, nominalAsli - diskon);
                                                const labelBulan = t.bulan ? `SPP Bulan ${NAMA_BULAN[t.bulan] || t.bulan}` : "SPP Bulanan";
                                                const catatanVerif = t.pembayaran?.[0]?.catatanVerifikasi;
                                                const statusTolak = t.pembayaran?.[0]?.buktiTransfer === null && t.status === "BELUM_BAYAR" && t.pembayaran?.length > 0;

                                                return (
                                                    <tr key={t.idTagihan} className="hover:bg-slate-50/50 transition">
                                                        <td className="p-5 font-bold text-slate-900">{t.childName}</td>
                                                        <td className="p-5 font-medium text-slate-800">{labelBulan}</td>
                                                        <td className="p-5 font-bold">
                                                            Rp {totalBayar.toLocaleString("id-ID")}
                                                        </td>
                                                        <td className="p-5">
                                                            <span
                                                                className={`px-2.5 py-1 rounded-md font-bold text-[10px] ${
                                                                    t.status === "LUNAS"
                                                                        ? "bg-emerald-100 text-emerald-800"
                                                                        : t.status === "MENUNGGU_VERIFIKASI"
                                                                            ? "bg-amber-100 text-amber-800"
                                                                            : statusTolak
                                                                                ? "bg-rose-100 text-rose-700"
                                                                                : "bg-rose-100 text-rose-700"
                                                                }`}
                                                            >
                                                                {t.status === "LUNAS"
                                                                    ? "Lunas"
                                                                    : t.status === "MENUNGGU_VERIFIKASI"
                                                                        ? "Menunggu Verifikasi"
                                                                        : statusTolak
                                                                            ? "Ditolak - Upload Ulang"
                                                                            : "Belum Dibayar"}
                                                            </span>
                                                        </td>
                                                        <td className="p-5 text-slate-500">
                                                            {t.pembayaran?.[0]?.metode || "-"}
                                                        </td>
                                                        <td className="p-5 text-slate-500 max-w-xs truncate">
                                                            {catatanVerif || (statusTolak ? "Bukti pembayaran ditolak, silakan upload ulang" : "-")}
                                                        </td>
                                                        <td className="p-5 text-right">
                                                            {t.status === "LUNAS" ? (
                                                                <span className="text-emerald-700 font-semibold">
                                                                    Terverifikasi
                                                                </span>
                                                            ) : t.status === "MENUNGGU_VERIFIKASI" ? (
                                                                <span className="text-amber-700 font-semibold">
                                                                    Diproses Bendahara
                                                                </span>
                                                            ) : (
                                                                <button
                                                                    onClick={() => {
                                                                        setSelectedTagihan(t.idTagihan);
                                                                        setPaymentMode("TRANSFER");
                                                                        setShowPaymentModal(true);
                                                                    }}
                                                                    className="text-amber-600 font-bold hover:underline cursor-pointer"
                                                                >
                                                                    {statusTolak ? "Upload Ulang" : "Bayar SPP Sekarang"}
                                                                </button>
                                                            )}
                                                        </td>
                                                    </tr>
                                                );
                                            })
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            {/* Jadwal Kedatangan Pembayaran Langsung */}
                            <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
                                <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center flex-wrap gap-2">
                                    <div>
                                        <h2 className="text-sm font-bold text-slate-900">
                                            Jadwal Kedatangan Pembayaran Langsung
                                        </h2>
                                        <p className="text-xs text-slate-500 mt-0.5">
                                            Slot kedatangan ke bagian administrasi/bendahara sekolah untuk pembayaran tunai langsung.
                                        </p>
                                    </div>
                                </div>

                                {bookingList.filter((b) => b.status !== "DIBATALKAN" && b.jenisBooking === "BAYAR_SPP").length > 0 && (
                                    <div className="p-6 border-b border-slate-100 bg-teal-50/40 space-y-2">
                                        <div className="text-xs font-bold text-[#095c51]">Jadwal Kedatangan Pembayaran Anda:</div>
                                        <div className="space-y-2">
                                            {bookingList
                                                .filter((b) => b.status !== "DIBATALKAN" && b.jenisBooking === "BAYAR_SPP")
                                                .map((b) => (
                                                    <div
                                                        key={b.idBooking}
                                                        className="bg-white border border-teal-200 rounded-xl px-4 py-3 flex items-center justify-between text-xs"
                                                    >
                                                        <div className="flex items-center space-x-2">
                                                            <Clock className="w-4 h-4 text-[#095c51]" />
                                                            <span className="font-bold text-slate-900">
                                                                {formatTanggalSlot(b.slot.tanggal)} · Pukul{" "}
                                                                {formatJamSlot(b.slot.jam)} WIB
                                                            </span>
                                                            <span className="px-2 py-0.5 rounded-md bg-teal-100 text-[#095c51] text-[10px] font-bold">
                                                                {b.status}
                                                            </span>
                                                        </div>
                                                        <div className="flex items-center space-x-2">
                                                            {b.catatanBendahara && (
                                                                <span className="text-[10px] text-slate-500 italic max-w-[200px] truncate">
                                                                    {b.catatanBendahara}
                                                                </span>
                                                            )}
                                                            {(b.status === "MENUNGGU" || b.status === "DIKONFIRMASI") && (
                                                                <button
                                                                    onClick={() => handleBatalBooking(b.idBooking)}
                                                                    className="text-rose-600 font-bold hover:underline cursor-pointer"
                                                                >
                                                                    Batalkan
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}
                                        </div>
                                    </div>
                                )}

                                <div className="p-6">
                                    <div className="text-xs font-bold text-slate-700 mb-3">
                                        Slot Waktu Kedatangan Tersedia (untuk Pembayaran SPP):
                                    </div>
                                    {slotList.length === 0 ? (
                                        <p className="text-xs text-slate-400">
                                            Belum ada slot kedatangan tersedia.
                                        </p>
                                    ) : (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                            {slotList.map((s) => {
                                                const penuh = s.sisa === 0;
                                                const sudah = bookingList.some(
                                                    (b) => b.slot.idSlot === s.idSlot && b.status !== "DIBATALKAN" && b.jenisBooking === "BAYAR_SPP"
                                                );
                                                return (
                                                    <div
                                                        key={s.idSlot}
                                                        className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 flex items-center justify-between gap-2"
                                                    >
                                                        <div>
                                                            <div className="text-xs font-bold text-slate-900">
                                                                {formatTanggalSlot(s.tanggal)}
                                                            </div>
                                                            <div className="text-[11px] text-[#095c51] font-semibold flex items-center gap-1 mt-0.5">
                                                                <Clock className="w-3 h-3" />
                                                                <span>{formatJamSlot(s.jam)} WIB</span>
                                                            </div>
                                                            <div className="text-[10px] text-slate-400 mt-0.5">
                                                                Sisa kuota: {s.sisa}/{s.kuota}
                                                            </div>
                                                        </div>
                                                        <button
                                                            disabled={penuh || sudah}
                                                            onClick={async () => {
                                                                const res = await fetch("/api/booking-kunjungan", {
                                                                    method: "POST",
                                                                    headers: { "Content-Type": "application/json" },
                                                                    body: JSON.stringify({ idSlot: s.idSlot, jenisBooking: "BAYAR_SPP" }),
                                                                }).then((r) => r.json());
                                                                if (res.success) toast.success(res.message);
                                                                else toast.error(res.error || "Gagal memesan slot.");
                                                                fetchSlotsAndBookings();
                                                            }}
                                                            className="px-3 py-2 rounded-xl bg-[#095c51] text-white text-[11px] font-bold cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
                                                        >
                                                            {sudah ? "Terbooking" : penuh ? "Penuh" : "Pilih Slot"}
                                                        </button>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                        );
                    })()}

                    {/* TAB: TABUNGAN SISWA */}
                    {activeTab === "savings" && (
                        <div className="space-y-6">
                            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs flex justify-between items-center flex-wrap gap-4">
                                <div>
                                    <h1 className="text-xl font-bold text-slate-900 flex items-center space-x-2">
                                        <Wallet className="w-5 h-5 text-[#095c51]" />
                                        <span>Tabungan Siswa</span>
                                    </h1>
                                    <p className="text-xs text-slate-500 mt-1">
                                        Pengelolaan saldo tabungan siswa transparan tanpa biaya administrasi.
                                    </p>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {familyChildren.map((child) => (
                                        <button
                                            key={child.id}
                                            onClick={() => setActiveChildId(child.id)}
                                            className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                                                activeChildId === child.id
                                                    ? "bg-[#095c51] text-white shadow-sm"
                                                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                                            }`}
                                        >
                                            {child.name} ({child.group})
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Card Saldo Utama */}
                            <div className="bg-[#095c51] text-white p-8 rounded-3xl shadow-md space-y-6 relative overflow-hidden">
                                <div className="absolute right-6 top-6 bg-teal-800/80 px-3 py-1 rounded-xl text-xs font-bold tracking-wider">
                                    {activeChild.group}
                                </div>
                                <div>
                                    <div className="text-xs uppercase tracking-wider text-teal-200 font-semibold">
                                        SALDO TABUNGAN · {activeChild.name.toUpperCase()}
                                    </div>
                                    <div className="text-4xl font-extrabold mt-2 tracking-tight">
                                        Rp {Number(activeChild.savingsBalance || 0).toLocaleString("id-ID")}
                                    </div>
                                </div>
                                <div className="pt-4 border-t border-teal-700/60 flex flex-wrap items-center gap-3">
                                    <button
                                        onClick={() => {
                                            if (familyChildren.length === 0) {
                                                toast.warning("Daftarkan anak terlebih dahulu sebelum menyetor tabungan.");
                                                return;
                                            }
                                            setSetorAnakId(activeChild.id || familyChildren[0]?.id || "");
                                            setShowSetorModal(true);
                                        }}
                                        className="px-5 py-2.5 bg-amber-400 hover:bg-amber-500 text-slate-900 rounded-xl text-xs font-bold transition cursor-pointer shadow-sm flex items-center space-x-2"
                                    >
                                        <Wallet className="w-4 h-4" />
                                        <span>+ Setor Tabungan</span>
                                    </button>
                                    <button
                                        onClick={() => {
                                            if (familyChildren.length === 0) {
                                                toast.warning("Daftarkan anak terlebih dahulu.");
                                                return;
                                            }
                                            setTarikAnakId(activeChild.id || familyChildren[0]?.id || "");
                                            setShowTarikModal(true);
                                        }}
                                        className="px-5 py-2.5 bg-rose-500 hover:bg-rose-600 text-white rounded-xl text-xs font-bold transition cursor-pointer flex items-center space-x-2"
                                    >
                                        <ArrowRight className="w-4 h-4" />
                                        <span>Penarikan Tabungan</span>
                                    </button>
                                </div>
                            </div>

                            {/* Riwayat Mutasi Tabungan */}
                            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
                                <div className="flex justify-between items-center pb-3 border-b border-slate-100">
                                    <h2 className="text-sm font-bold text-slate-900">Riwayat Mutasi Tabungan (Setoran & Bayar SPP)</h2>
                                    <span className="text-xs text-slate-400 font-medium">
                                        {activeChild.tabunganMutasi?.length || 0} Transaksi
                                    </span>
                                </div>

                                {(!activeChild.tabunganMutasi || activeChild.tabunganMutasi.length === 0) ? (
                                    <p className="text-xs text-slate-400 py-4 text-center">
                                        Belum ada riwayat transaksi tabungan.
                                    </p>
                                ) : (
                                    <div className="space-y-3">
                                        {activeChild.tabunganMutasi.map((mut: any) => {
                                            const adalahSetor = mut.jenis === "SETOR";
                                            return (
                                                <div
                                                    key={mut.id}
                                                    className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex justify-between items-center"
                                                >
                                                    <div className="flex items-center space-x-3">
                                                        <div
                                                            className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold ${
                                                                adalahSetor
                                                                    ? "bg-emerald-100 text-emerald-700"
                                                                    : "bg-rose-100 text-rose-700"
                                                            }`}
                                                        >
                                                            {adalahSetor ? (
                                                                <ArrowDownLeft className="w-5 h-5" />
                                                            ) : (
                                                                <ArrowUpRight className="w-5 h-5" />
                                                            )}
                                                        </div>
                                                        <div>
                                                            <div className="text-xs font-bold text-slate-900">{mut.ket}</div>
                                                            <div className="text-[11px] text-slate-400">{mut.tgl}</div>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <div
                                                            className={`text-xs font-bold ${
                                                                adalahSetor ? "text-emerald-600" : "text-rose-600"
                                                            }`}
                                                        >
                                                            {adalahSetor ? "+" : "-"} Rp{" "}
                                                            {Number(mut.nominal).toLocaleString("id-ID")}
                                                        </div>
                                                        <span
                                                            className={`inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-semibold ${
                                                                mut.status === "Selesai"
                                                                    ? "bg-emerald-50 text-emerald-700"
                                                                    : mut.status === "Menunggu Verifikasi"
                                                                        ? "bg-amber-50 text-amber-700"
                                                                        : "bg-rose-50 text-rose-700"
                                                            }`}
                                                        >
                                                            {mut.status}
                                                        </span>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                            {/* Riwayat Penarikan Tabungan */}
                            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
                                <div className="flex justify-between items-center pb-3 border-b border-slate-100">
                                    <h2 className="text-sm font-bold text-slate-900">Riwayat Penarikan Tabungan</h2>
                                    <span className="text-xs text-slate-400 font-medium">
                                        {activeChild.penarikanMutasi?.length || 0} Pengajuan
                                    </span>
                                </div>

                                {(!activeChild.penarikanMutasi || activeChild.penarikanMutasi.length === 0) ? (
                                    <p className="text-xs text-slate-400 py-4 text-center">
                                        Belum ada riwayat penarikan tabungan.
                                    </p>
                                ) : (
                                    <div className="space-y-3">
                                        {activeChild.penarikanMutasi.map((mut: any) => (
                                            <div
                                                key={mut.id}
                                                className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex justify-between items-center"
                                            >
                                                <div className="flex items-center space-x-3">
                                                    <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center font-bold">
                                                        <ArrowUpRight className="w-5 h-5" />
                                                    </div>
                                                    <div>
                                                        <div className="text-xs font-bold text-slate-900">{mut.ket}</div>
                                                        <div className="text-[11px] text-slate-400">{mut.tgl}</div>
                                                        {mut.status === "Ditolak" && mut.catatanPenolakan && (
                                                            <div className="text-[10px] text-rose-600 mt-1">
                                                                Alasan: {mut.catatanPenolakan}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <div className="text-xs font-bold text-rose-600">
                                                        - Rp {Number(mut.nominal).toLocaleString("id-ID")}
                                                    </div>
                                                    <span
                                                        className={`inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-semibold ${
                                                            mut.status === "Selesai"
                                                                ? "bg-emerald-50 text-emerald-700"
                                                                : mut.status === "Menunggu Verifikasi"
                                                                    ? "bg-amber-50 text-amber-700"
                                                                    : "bg-rose-50 text-rose-700"
                                                        }`}
                                                    >
                                                        {mut.status}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* TAB: LAPORAN MINGGUAN */}
                    {activeTab === "reports" && (
                        <div className="space-y-6">
                            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs flex justify-between items-center flex-wrap gap-4">
                                <div>
                                    <h1 className="text-xl font-bold text-slate-900">Laporan Mingguan Pembelajaran</h1>
                                    <p className="text-xs text-slate-500 mt-1">
                                        Pantau perkembangan harian dan mingguan tematik siswa dari guru kelas.
                                    </p>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {familyChildren.map((child) => (
                                        <button
                                            key={child.id}
                                            onClick={() => setActiveChildId(child.id)}
                                            className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                                                activeChildId === child.id
                                                    ? "bg-[#095c51] text-white shadow-sm"
                                                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                                            }`}
                                        >
                                            {child.name} ({child.group})
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {(!activeChild.laporanMingguan || activeChild.laporanMingguan.length === 0) ? (
                                <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-xs text-center text-xs text-slate-400">
                                    Belum ada laporan mingguan untuk {activeChild.name}.
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {activeChild.laporanMingguan.map((lap: any, idx: number) => (
                                        <div
                                            key={lap.id || idx}
                                            className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4"
                                        >
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <h2 className="text-sm font-bold text-slate-900">
                                                        Tema: {lap.tema}
                                                    </h2>
                                                    <p className="text-[11px] text-slate-400 mt-0.5">{lap.periode}</p>
                                                </div>
                                                <span className="px-3 py-1 bg-teal-100 text-[#095c51] rounded-xl text-xs font-bold">
                                                    {activeChild.group} - {activeChild.name}
                                                </span>
                                            </div>

                                            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs text-slate-700 leading-relaxed">
                                                {lap.isi}
                                            </div>

                                            {lap.dokumentasi && lap.dokumentasi.length > 0 && (
                                                <div>
                                                    <div className="text-xs font-bold text-slate-700 mb-2">
                                                        Aspek Perkembangan
                                                    </div>
                                                    <div className="flex flex-wrap gap-2">
                                                        {lap.dokumentasi.map((doc: string, dIdx: number) => (
                                                            <div
                                                                key={dIdx}
                                                                className="px-4 py-2 rounded-xl bg-slate-100 border border-slate-200 flex items-center space-x-2 text-slate-600"
                                                            >
                                                                <ImageIcon className="w-4 h-4 text-[#095c51]" />
                                                                <span className="text-[11px] font-semibold">{doc}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* TAB: BERKAS KELUARGA */}
                    {activeTab === "family_files" && (
                        <div className="space-y-6">
                            <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-xs">
                                <h1 className="text-xl font-bold text-slate-900">Berkas Keluarga</h1>
                                <p className="text-xs text-slate-500 mt-1">
                                    KK dan KTP orang tua dipakai bersama oleh semua anak di akun ini.
                                </p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Kartu KK */}
                                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
                                    <div className="flex items-center justify-between">
                                        <h2 className="text-sm font-bold text-slate-900">Kartu Keluarga (KK)</h2>
                                        {fileKKName ? (
                                            <span className="px-2 py-1 bg-emerald-100 text-emerald-800 rounded-full text-xs font-bold">
                                                Terunggah
                                            </span>
                                        ) : (
                                            <span className="px-2 py-1 bg-rose-100 text-rose-700 rounded-full text-xs font-bold">
                                                Belum
                                            </span>
                                        )}
                                    </div>
                                    {fileKKName ? (
                                        <div className="flex items-center justify-between">
                                            <div className="h-40 rounded-xl border border-slate-200 bg-white flex items-center justify-center overflow-hidden w-full">
                                                {fileKKName.toLowerCase().endsWith(".pdf") ? (
                                                    <div className="flex flex-col items-center gap-1 text-slate-500">
                                                        <FileText className="w-10 h-10 text-[#095c51]" />
                                                        <span className="text-xs">Dokumen PDF</span>
                                                    </div>
                                                ) : (
                                                    <img
                                                        src={keUrlBerkas(fileKKName)}
                                                        alt="Kartu Keluarga"
                                                        className="max-w-full max-h-full object-contain"
                                                    />
                                                )}
                                            </div>
                                            <div className="ml-4 flex flex-col space-y-2">
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        setPreviewBerkas({
                                                            label: "Kartu Keluarga (KK)",
                                                            url: keUrlBerkas(fileKKName),
                                                            isPdf: fileKKName.toLowerCase().endsWith(".pdf"),
                                                        })
                                                    }
                                                    className="px-4 py-2 bg-[#095c51] text-white rounded-xl text-xs font-bold hover:bg-[#074840] transition cursor-pointer"
                                                >
                                                    Lihat Berkas
                                                </button>
                                                <a
                                                    href={keUrlBerkas(fileKKName)}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-200 transition text-center"
                                                >
                                                    Unduh
                                                </a>
                                            </div>
                                        </div>
                                    ) : (
                                        <p className="text-xs text-slate-400">Belum ada file KK yang diunggah.</p>
                                    )}
                                    <input
                                        type="file"
                                        accept=".pdf,image/jpeg,image/png"
                                        onChange={(e) => e.target.files?.[0] && handleUploadBerkasKeluarga("KK", e.target.files[0])}
                                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs cursor-pointer"
                                    />
                                </div>

                                {/* Kartu KTP Orang Tua */}
                                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
                                    <div className="flex items-center justify-between">
                                        <h2 className="text-sm font-bold text-slate-900">KTP Orang Tua / Wali</h2>
                                        {fileKTPName ? (
                                            <span className="px-2 py-1 bg-emerald-100 text-emerald-800 rounded-full text-xs font-bold">
                                                Terunggah
                                            </span>
                                        ) : (
                                            <span className="px-2 py-1 bg-rose-100 text-rose-700 rounded-full text-xs font-bold">
                                                Belum
                                            </span>
                                        )}
                                    </div>
                                    {fileKTPName ? (
                                        <div className="flex items-center justify-between">
                                            <div className="h-40 rounded-xl border border-slate-200 bg-white flex items-center justify-center overflow-hidden w-full">
                                                {fileKTPName.toLowerCase().endsWith(".pdf") ? (
                                                    <div className="flex flex-col items-center gap-1 text-slate-500">
                                                        <FileText className="w-10 h-10 text-[#095c51]" />
                                                        <span className="text-xs">Dokumen PDF</span>
                                                    </div>
                                                ) : (
                                                    <img
                                                        src={keUrlBerkas(fileKTPName)}
                                                        alt="KTP Orang Tua"
                                                        className="max-w-full max-h-full object-contain"
                                                    />
                                                )}
                                            </div>
                                            <div className="ml-4 flex flex-col space-y-2">
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        setPreviewBerkas({
                                                            label: "KTP Orang Tua",
                                                            url: keUrlBerkas(fileKTPName),
                                                            isPdf: fileKTPName.toLowerCase().endsWith(".pdf"),
                                                        })
                                                    }
                                                    className="px-4 py-2 bg-[#095c51] text-white rounded-xl text-xs font-bold hover:bg-[#074840] transition cursor-pointer"
                                                >
                                                    Lihat Berkas
                                                </button>
                                                <a
                                                    href={keUrlBerkas(fileKTPName)}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-200 transition text-center"
                                                >
                                                    Unduh
                                                </a>
                                            </div>
                                        </div>
                                    ) : (
                                        <p className="text-xs text-slate-400">Belum ada file KTP yang diunggah.</p>
                                    )}
                                    <input
                                        type="file"
                                        accept=".pdf,image/jpeg,image/png"
                                        onChange={(e) => e.target.files?.[0] && handleUploadBerkasKeluarga("KTP_ORTU", e.target.files[0])}
                                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs cursor-pointer"
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* MODAL PREVIEW BERKAS */}
                    {previewBerkas && (
                        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4">
                            <div className="bg-white rounded-3xl w-full max-w-2xl p-6 shadow-2xl border border-slate-100 relative">
                                <div className="flex justify-between items-center border-b border-slate-100 pb-4 mb-4">
                                    <h2 className="text-base font-bold text-slate-900">{previewBerkas.label}</h2>
                                    <button
                                        onClick={() => setPreviewBerkas(null)}
                                        className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 cursor-pointer"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                                <div className="bg-slate-100 rounded-2xl min-h-[300px] flex items-center justify-center overflow-hidden">
                                    {previewBerkas.url.toLowerCase().endsWith('.pdf') ? (
                                        <iframe src={previewBerkas.url} className="w-full h-[60vh] border-0 rounded-xl" title={previewBerkas.label} />
                                    ) : (
                                        <img
                                            src={previewBerkas.url}
                                            alt={previewBerkas.label}
                                            className="max-w-full max-h-[60vh] object-contain rounded-xl"
                                        />
                                    )}
                                </div>
                                <div className="mt-4 flex justify-center gap-3">
                                    <a
                                        href={previewBerkas.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#095c51] text-white rounded-xl text-xs font-bold hover:bg-[#074840] transition"
                                    >
                                        <Download className="w-4 h-4" />
                                        <span>Unduh Berkas</span>
                                    </a>
                                    <button
                                        onClick={() => setPreviewBerkas(null)}
                                        className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer"
                                    >
                                        Tutup
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* MODAL TAMBAH ANAK BARU */}
                    {showAddChildModal && (
                        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4">
                            <div className="bg-white rounded-3xl w-full max-w-xl p-6 shadow-2xl border border-slate-100 relative max-h-[90vh] overflow-y-auto">
                                <div className="flex justify-between items-center border-b border-slate-100 pb-4 mb-4">
                                    <h2 className="text-base font-bold text-slate-900">
                                        {modalStep === 1 ? "Data Anak Baru" : modalStep === 2 ? "Berkas Anak" : "Konfirmasi"}
                                    </h2>
                                    <button
                                        onClick={() => { setShowAddChildModal(false); setModalStep(1); }}
                                        className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 cursor-pointer"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>

                                {modalStep === 1 && (
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-600 mb-1">Nama Lengkap Anak *</label>
                                            <input
                                                type="text"
                                                value={namaAnak}
                                                onChange={(e) => setNamaAnak(e.target.value)}
                                                placeholder="Contoh: Muhammad Rizky Pratama"
                                                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-600 mb-1">NIK Anak (16 digit) *</label>
                                            <input
                                                type="text"
                                                value={nikAnak}
                                                onChange={(e) => setNikAnak(e.target.value)}
                                                placeholder="16 digit angka"
                                                maxLength={16}
                                                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-600 mb-1">Tanggal Lahir *</label>
                                            <input
                                                type="date"
                                                value={tglLahirAnak}
                                                onChange={(e) => setTglLahirAnak(e.target.value)}
                                                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-600 mb-1">Jenis Kelamin *</label>
                                            <select
                                                value={jenisKelamin}
                                                onChange={(e) => setJenisKelamin(e.target.value)}
                                                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs"
                                            >
                                                <option value="Laki-laki">Laki-laki</option>
                                                <option value="Perempuan">Perempuan</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-600 mb-1">Jalur Pendaftaran *</label>
                                            <select
                                                value={jalurPendaftaran}
                                                onChange={(e) => setJalurPendaftaran(e.target.value)}
                                                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs"
                                            >
                                                <option value="Daring">Daring (Online)</option>
                                                <option value="Onsite">Datang Langsung (Onsite)</option>
                                            </select>
                                        </div>
                                        {jalurPendaftaran === "Onsite" && (
                                            <div>
                                                <label className="block text-xs font-semibold text-slate-600 mb-1">Slot Kedatangan Onsite *</label>
                                                <select
                                                    value={selectedOnsiteSlot}
                                                    onChange={(e) => setSelectedOnsiteSlot(e.target.value)}
                                                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs"
                                                >
                                                    <option value="">Pilih slot...</option>
                                                    {slotList.map((s) => (
                                                        <option key={s.idSlot} value={s.idSlot}>
                                                            {formatTanggalSlot(s.tanggal)} · {formatJamSlot(s.jam)} WIB (Sisa: {s.sisa})
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                        )}
                                        {infoKelompokCalon && (
                                            <div className="p-3 bg-teal-50 border border-teal-200 rounded-xl text-xs">
                                                <div className="font-bold text-[#095c51]">Kelompok Otomatis: {infoKelompokCalon.nama}</div>
                                                <div className="text-slate-600">Usia: {infoKelompokCalon.usia} tahun</div>
                                            </div>
                                        )}
                                        <button
                                            onClick={handleLanjutStep}
                                            disabled={isSubmitting}
                                            className="w-full px-4 py-2.5 bg-[#095c51] text-white rounded-xl text-xs font-bold cursor-pointer disabled:opacity-50"
                                        >
                                            {isSubmitting ? "Memproses..." : "Lanjut"}
                                        </button>
                                    </div>
                                )}

                                {modalStep === 2 && (
                                    <div className="space-y-4">
                                        <p className="text-xs text-slate-500">Semua berkas wajib diunggah (PDF/JPG/PNG, maks 5 MB)</p>
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-600 mb-1">Akta Kelahiran *</label>
                                            <input
                                                type="file"
                                                accept=".pdf,image/jpeg,image/png"
                                                onChange={(e) => e.target.files?.[0] && setFileAkta(e.target.files[0])}
                                                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs cursor-pointer"
                                            />
                                            {fileAkta && <p className="text-xs text-emerald-600 mt-1">{fileAkta.name}</p>}
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-600 mb-1">Pas Foto 3x4 *</label>
                                            <input
                                                type="file"
                                                accept="image/jpeg,image/png"
                                                onChange={(e) => e.target.files?.[0] && setFileFoto(e.target.files[0])}
                                                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs cursor-pointer"
                                            />
                                            {fileFoto && <p className="text-xs text-emerald-600 mt-1">{fileFoto.name}</p>}
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-600 mb-1">Kartu Identitas Anak (KIA) *</label>
                                            <input
                                                type="file"
                                                accept=".pdf,image/jpeg,image/png"
                                                onChange={(e) => e.target.files?.[0] && setFileKia(e.target.files[0])}
                                                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs cursor-pointer"
                                            />
                                            {fileKia && <p className="text-xs text-emerald-600 mt-1">{fileKia.name}</p>}
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => setModalStep(1)}
                                                className="flex-1 px-4 py-2.5 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold cursor-pointer"
                                            >
                                                Kembali
                                            </button>
                                            <button
                                                onClick={handleSaveNewChild}
                                                disabled={isSubmitting}
                                                className="flex-1 px-4 py-2.5 bg-[#095c51] text-white rounded-xl text-xs font-bold cursor-pointer disabled:opacity-50"
                                            >
                                                {isSubmitting ? "Menyimpan..." : "Simpan & Daftar"}
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {modalStep === 3 && (
                                    <div className="space-y-4 text-center">
                                        <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-4">
                                            <CheckCircle2 className="w-8 h-8" />
                                        </div>
                                        <h3 className="text-lg font-bold text-slate-900">Data Siap Disimpan</h3>
                                        <p className="text-xs text-slate-500">Klik tombol di bawah untuk menyimpan pendaftaran anak baru.</p>
                                        <div className="p-4 bg-slate-50 rounded-xl text-left text-xs space-y-1">
                                            <p><span className="font-semibold">Nama:</span> {namaAnak}</p>
                                            <p><span className="font-semibold">NIK:</span> {nikAnak}</p>
                                            <p><span className="font-semibold">Tgl Lahir:</span> {tglLahirAnak}</p>
                                            <p><span className="font-semibold">Jalur:</span> {jalurPendaftaran}</p>
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => setModalStep(2)}
                                                className="flex-1 px-4 py-2.5 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold cursor-pointer"
                                            >
                                                Edit
                                            </button>
                                            <button
                                                onClick={handleSaveNewChild}
                                                disabled={isSubmitting}
                                                className="flex-1 px-4 py-2.5 bg-[#095c51] text-white rounded-xl text-xs font-bold cursor-pointer disabled:opacity-50"
                                            >
                                                {isSubmitting ? "Menyimpan..." : "Simpan & Daftar"}
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* MODAL BAYAR BIAYA PENDAFTARAN (KHUSUS DI MENU ANAK & PENDAFTARAN) */}
                    {showPendaftaranModal && targetPendaftaranAnak && (() => {
                        const tagihanPendaftaran = (targetPendaftaranAnak.tagihan || []).find((t: any) => t.jenis === "PENDAFTARAN");
                        const nominalAsli = tagihanPendaftaran ? Number(tagihanPendaftaran.nominal) : 1570000;
                        const diskon = tagihanPendaftaran ? Number(tagihanPendaftaran.diskon || 0) : 0;
                        const totalBayar = Math.max(0, nominalAsli - diskon);

                        return (
                        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4">
                            <div className="bg-white rounded-3xl w-full max-w-xl p-6 shadow-2xl border border-slate-100 relative max-h-[90vh] overflow-y-auto space-y-5">
                                <div className="flex justify-between items-center border-b border-slate-100 pb-4">
                                    <div>
                                        <h2 className="text-base font-bold text-slate-900">Pembayaran Biaya Pendaftaran</h2>
                                        <p className="text-xs text-slate-500 mt-0.5">Calon Siswa: <span className="font-bold text-slate-800">{targetPendaftaranAnak.name}</span></p>
                                    </div>
                                    <button
                                        onClick={() => { setShowPendaftaranModal(false); setBuktiPendaftaran(null); setTargetPendaftaranAnak(null); }}
                                        className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 cursor-pointer"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>

                                {/* Rincian Biaya Pendaftaran */}
                                <div className="p-4 bg-teal-50/70 border border-teal-200 rounded-2xl space-y-2 text-xs">
                                    <div className="flex justify-between text-slate-600">
                                        <span>Biaya Formulir &amp; Pendaftaran:</span>
                                        <span>Rp {nominalAsli.toLocaleString("id-ID")}</span>
                                    </div>
                                    {diskon > 0 && (
                                        <div className="flex justify-between text-emerald-700 font-semibold">
                                            <span>Diskon Gelombang Pendaftaran:</span>
                                            <span>- Rp {diskon.toLocaleString("id-ID")}</span>
                                        </div>
                                    )}
                                    <div className="flex justify-between font-extrabold text-sm text-[#095c51] pt-2 border-t border-teal-200">
                                        <span>Total Yang Harus Dibayar:</span>
                                        <span>Rp {totalBayar.toLocaleString("id-ID")}</span>
                                    </div>
                                </div>

                                {/* Pilihan Metode Pembayaran */}
                                <div className="flex gap-2 p-1 bg-slate-100 rounded-xl">
                                    <button
                                        type="button"
                                        onClick={() => setModePendaftaranBayar("TRANSFER")}
                                        className={`flex-1 py-2 text-xs font-bold rounded-lg transition cursor-pointer ${
                                            modePendaftaranBayar === "TRANSFER"
                                                ? "bg-white text-[#095c51] shadow-xs"
                                                : "text-slate-600 hover:text-slate-900"
                                        }`}
                                    >
                                        Transfer Bank (TF)
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setModePendaftaranBayar("LANGSUNG")}
                                        className={`flex-1 py-2 text-xs font-bold rounded-lg transition cursor-pointer ${
                                            modePendaftaranBayar === "LANGSUNG"
                                                ? "bg-white text-[#095c51] shadow-xs"
                                                : "text-slate-600 hover:text-slate-900"
                                        }`}
                                    >
                                        Bayar Tunai di Sekolah (Onsite)
                                    </button>
                                </div>

                                {modePendaftaranBayar === "TRANSFER" ? (
                                    <div className="space-y-4">
                                        <InfoRekeningSekolah />

                                        <div>
                                            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                                                Unggah Bukti Transfer Pendaftaran *
                                            </label>
                                            <input
                                                type="file"
                                                accept=".pdf,image/jpeg,image/png"
                                                onChange={(e) => e.target.files?.[0] && setBuktiPendaftaran(e.target.files[0])}
                                                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs cursor-pointer"
                                            />
                                            {buktiPendaftaran && <p className="text-xs text-emerald-600 mt-1 font-semibold">{buktiPendaftaran.name}</p>}
                                        </div>

                                        <div className="flex gap-2 pt-2">
                                            <button
                                                type="button"
                                                onClick={() => { setShowPendaftaranModal(false); setBuktiPendaftaran(null); }}
                                                className="flex-1 px-4 py-2.5 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold cursor-pointer"
                                            >
                                                Batal
                                            </button>
                                            <button
                                                type="button"
                                                onClick={handleKirimPembayaranPendaftaran}
                                                disabled={isSubmitting}
                                                className="flex-1 px-4 py-2.5 bg-[#095c51] hover:bg-[#074840] text-white rounded-xl text-xs font-bold cursor-pointer disabled:opacity-50"
                                            >
                                                {isSubmitting ? "Mengirim..." : "Kirim Bukti Pembayaran"}
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        <p className="text-xs text-slate-500">
                                            Pilih slot jadwal kedatangan ke sekolah untuk melakukan pembayaran biaya pendaftaran secara tunai langsung ke Bendahara.
                                        </p>
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Slot Kedatangan Tersedia *</label>
                                            <select
                                                value={slotPendaftaran}
                                                onChange={(e) => setSlotPendaftaran(e.target.value)}
                                                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-xs"
                                            >
                                                <option value="">Pilih slot kedatangan...</option>
                                                {slotList.map((s) => (
                                                    <option key={s.idSlot} value={s.idSlot} disabled={s.sisa === 0}>
                                                        {formatTanggalSlot(s.tanggal)} · {formatJamSlot(s.jam)} WIB (Sisa kuota: {s.sisa})
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="flex gap-2 pt-2">
                                            <button
                                                type="button"
                                                onClick={() => { setShowPendaftaranModal(false); setSlotPendaftaran(""); }}
                                                className="flex-1 px-4 py-2.5 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold cursor-pointer"
                                            >
                                                Batal
                                            </button>
                                            <button
                                                type="button"
                                                onClick={handleKirimPembayaranPendaftaran}
                                                disabled={isSubmitting}
                                                className="flex-1 px-4 py-2.5 bg-amber-400 hover:bg-amber-500 text-slate-900 rounded-xl text-xs font-bold cursor-pointer disabled:opacity-50"
                                            >
                                                {isSubmitting ? "Memesan..." : "Pesan Slot Kedatangan"}
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                        );
                    })()}

                    {/* MODAL BAYAR TAGIHAN / BOOKING KEDATANGAN */}
                    {showPaymentModal && (
                        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4">
                            <div className="bg-white rounded-3xl w-full max-w-xl p-6 shadow-2xl border border-slate-100 relative max-h-[90vh] overflow-y-auto">
                                <div className="flex justify-between items-center border-b border-slate-100 pb-4 mb-4">
                                    <h2 className="text-base font-bold text-slate-900">
                                        {paymentMode === "TRANSFER" ? "Bayar SPP via Transfer Bank" : "Booking Kedatangan Bayar SPP Langsung"}
                                    </h2>
                                    <button
                                        onClick={() => { setShowPaymentModal(false); setBuktiTransfer(null); setSelectedPaySlot(""); }}
                                        className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 cursor-pointer"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>

                                {paymentMode === "TRANSFER" ? (
                                    <div className="space-y-4">
                                        <InfoRekeningSekolah />
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-600 mb-1">Pilih Tagihan SPP *</label>
                                            <select
                                                value={selectedTagihan}
                                                onChange={(e) => setSelectedTagihan(e.target.value)}
                                                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs"
                                            >
                                                <option value="">Pilih tagihan SPP...</option>
                                                {familyChildren.flatMap((child) =>
                                                    (child.tagihan || [])
                                                        .filter((t: any) => t.jenis === "SPP")
                                                        .map((t: any) => (
                                                            <option key={t.idTagihan} value={t.idTagihan}>
                                                                {child.name} - SPP Bulan {NAMA_BULAN[t.bulan] || t.bulan} (Rp{(Number(t.nominal) - Number(t.diskon)).toLocaleString("id-ID")}) - {t.status}
                                                            </option>
                                                        ))
                                                )}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-600 mb-1">Unggah Bukti Transfer *</label>
                                            <input
                                                type="file"
                                                accept=".pdf,image/jpeg,image/png"
                                                onChange={(e) => e.target.files?.[0] && setBuktiTransfer(e.target.files[0])}
                                                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs cursor-pointer"
                                            />
                                            {buktiTransfer && <p className="text-xs text-emerald-600 mt-1">{buktiTransfer.name}</p>}
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => { setShowPaymentModal(false); setBuktiTransfer(null); }}
                                                className="flex-1 px-4 py-2.5 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold cursor-pointer"
                                            >
                                                Batal
                                            </button>
                                            <button
                                                onClick={handleKirimPembayaran}
                                                disabled={isSubmitting}
                                                className="flex-1 px-4 py-2.5 bg-[#095c51] text-white rounded-xl text-xs font-bold cursor-pointer disabled:opacity-50"
                                            >
                                                {isSubmitting ? "Mengirim..." : "Kirim Bukti"}
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        <p className="text-xs text-slate-500">Pilih slot waktu kedatangan ke sekolah untuk pembayaran tunai langsung ke Bendahara.</p>
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-600 mb-1">Slot Kedatangan *</label>
                                            <select
                                                value={selectedPaySlot}
                                                onChange={(e) => setSelectedPaySlot(e.target.value)}
                                                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs"
                                            >
                                                <option value="">Pilih slot...</option>
                                                {slotList.map((s) => (
                                                    <option key={s.idSlot} value={s.idSlot} disabled={s.sisa === 0}>
                                                        {formatTanggalSlot(s.tanggal)} · {formatJamSlot(s.jam)} WIB (Sisa: {s.sisa})
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => { setShowPaymentModal(false); setSelectedPaySlot(""); }}
                                                className="flex-1 px-4 py-2.5 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold cursor-pointer"
                                            >
                                                Batal
                                            </button>
                                            <button
                                                onClick={handleKirimPembayaran}
                                                disabled={isSubmitting}
                                                className="flex-1 px-4 py-2.5 bg-amber-400 text-slate-900 rounded-xl text-xs font-bold cursor-pointer disabled:opacity-50"
                                            >
                                                {isSubmitting ? "Memesan..." : "Pesan Slot"}
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* MODAL SETOR TABUNGAN */}
                    {showSetorModal && (
                        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4">
                            <div className="bg-white rounded-3xl w-full max-w-xl p-6 shadow-2xl border border-slate-100 relative max-h-[90vh] overflow-y-auto">
                                <div className="flex justify-between items-center border-b border-slate-100 pb-4 mb-4">
                                    <h2 className="text-base font-bold text-slate-900">Setor Tabungan Siswa</h2>
                                    <button
                                        onClick={() => { setShowSetorModal(false); setSetorNominal(""); setSetorBukti(null); setSetorSlotId(""); }}
                                        className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 cursor-pointer"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>

                                <form onSubmit={handleKirimSetorTabungan} className="space-y-4">
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-600 mb-1">Anak *</label>
                                        <select
                                            value={setorAnakId}
                                            onChange={(e) => setSetorAnakId(e.target.value)}
                                            className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs"
                                        >
                                            <option value="">Pilih anak...</option>
                                            {familyChildren.map((c) => (
                                                <option key={c.id} value={c.id}>{c.name} ({c.group}) - Saldo: Rp{c.savingsBalance.toLocaleString("id-ID")}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-600 mb-1">Nominal (Rp) *</label>
                                        <input
                                            type="number"
                                            min="1"
                                            value={setorNominal}
                                            onChange={(e) => setSetorNominal(e.target.value)}
                                            placeholder="Contoh: 50000"
                                            className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-600 mb-1">Metode *</label>
                                        <select
                                            value={setorMetode}
                                            onChange={(e) => setSetorMetode(e.target.value as "TRANSFER" | "TUNAI")}
                                            className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs"
                                        >
                                            <option value="TRANSFER">Transfer Bank (unggah bukti)</option>
                                            <option value="TUNAI">Tunai (booking kedatangan ke sekolah)</option>
                                        </select>
                                    </div>
                                    {setorMetode === "TRANSFER" && (
                                        <div className="space-y-3">
                                            <InfoRekeningSekolah />
                                            <div>
                                                <label className="block text-xs font-semibold text-slate-600 mb-1">Bukti Transfer *</label>
                                                <input
                                                    type="file"
                                                    accept=".pdf,image/jpeg,image/png"
                                                    onChange={(e) => e.target.files?.[0] && setSetorBukti(e.target.files[0])}
                                                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs cursor-pointer"
                                                />
                                                {setorBukti && <p className="text-xs text-emerald-600 mt-1">{setorBukti.name}</p>}
                                            </div>
                                        </div>
                                    )}
                                    {setorMetode === "TUNAI" && (
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-600 mb-1">Slot Kedatangan *</label>
                                            <select
                                                value={setorSlotId}
                                                onChange={(e) => setSetorSlotId(e.target.value)}
                                                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs"
                                            >
                                                <option value="">Pilih slot...</option>
                                                {slotList.map((s) => (
                                                    <option key={s.idSlot} value={s.idSlot} disabled={s.sisa === 0}>
                                                        {formatTanggalSlot(s.tanggal)} · {formatJamSlot(s.jam)} WIB (Sisa: {s.sisa})
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    )}
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-600 mb-1">Keterangan</label>
                                        <textarea
                                            value={setorKeterangan}
                                            onChange={(e) => setSetorKeterangan(e.target.value)}
                                            placeholder="Opsional"
                                            rows={2}
                                            className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs"
                                        />
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            type="button"
                                            onClick={() => { setShowSetorModal(false); setSetorNominal(""); setSetorBukti(null); setSetorSlotId(""); }}
                                            className="flex-1 px-4 py-2.5 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold cursor-pointer"
                                        >
                                            Batal
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={isSubmitting}
                                            className="flex-1 px-4 py-2.5 bg-[#095c51] text-white rounded-xl text-xs font-bold cursor-pointer disabled:opacity-50"
                                        >
                                            {isSubmitting ? "Mengirim..." : "Kirim Setoran"}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    )}

                    {/* MODAL PENARIKAN TABUNGAN */}
                    {showTarikModal && (
                        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4">
                            <div className="bg-white rounded-3xl w-full max-w-xl p-6 shadow-2xl border border-slate-100 relative max-h-[90vh] overflow-y-auto">
                                <div className="flex justify-between items-center border-b border-slate-100 pb-4 mb-4">
                                    <h2 className="text-base font-bold text-slate-900">Penarikan Tabungan Siswa</h2>
                                    <button
                                        onClick={() => { setShowTarikModal(false); setTarikNominal(""); setTarikKeterangan(""); }}
                                        className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 cursor-pointer"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>

                                <form onSubmit={handleKirimPenarikan} className="space-y-4">
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-600 mb-1">Anak *</label>
                                        <select
                                            value={tarikAnakId}
                                            onChange={(e) => setTarikAnakId(e.target.value)}
                                            className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs"
                                        >
                                            <option value="">Pilih anak...</option>
                                            {familyChildren.map((c) => (
                                                <option key={c.id} value={c.id}>{c.name} ({c.group}) - Saldo: Rp{c.savingsBalance.toLocaleString("id-ID")}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-600 mb-1">Nominal Penarikan (Rp) *</label>
                                        <input
                                            type="number"
                                            min="1"
                                            value={tarikNominal}
                                            onChange={(e) => setTarikNominal(e.target.value)}
                                            placeholder="Contoh: 100000"
                                            className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-600 mb-1">Keterangan</label>
                                        <textarea
                                            value={tarikKeterangan}
                                            onChange={(e) => setTarikKeterangan(e.target.value)}
                                            placeholder="Contoh: Keperluan sekolah, beli seragam, dll"
                                            rows={2}
                                            className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs"
                                        />
                                    </div>
                                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
                                        <strong>Catatan:</strong> Penarikan tabungan memerlukan verifikasi Bendahara. Uang tunai dapat diambil di kantor Bendahara setelah disetujui.
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            type="button"
                                            onClick={() => { setShowTarikModal(false); setTarikNominal(""); setTarikKeterangan(""); }}
                                            className="flex-1 px-4 py-2.5 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold cursor-pointer"
                                        >
                                            Batal
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={isSubmitting}
                                            className="flex-1 px-4 py-2.5 bg-rose-500 text-white rounded-xl text-xs font-bold cursor-pointer disabled:opacity-50"
                                        >
                                            {isSubmitting ? "Mengirim..." : "Ajukan Penarikan"}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
}