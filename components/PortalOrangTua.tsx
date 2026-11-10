'use client';
/* eslint-disable @typescript-eslint/no-explicit-any -- bentuk respons API belum punya tipe bersama; ditandai untuk dirapikan bertahap. */

import React, { useState, useEffect } from "react";
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
    slot: { idSlot: string; tanggal: string; jam: string };
};

const keUrlBerkas = (file: string) => (file.startsWith("/") || file.startsWith("http") || file.startsWith("blob:") ? file : `/uploads/${file}`);
const formatTanggalSlot = (s: string) =>
    new Date(s).toLocaleDateString("id-ID", { weekday: "short", day: "2-digit", month: "short", year: "numeric" });
const formatJamSlot = (s: string) => (s.includes("T") ? s.slice(11, 16) : s.slice(0, 5));

function buatInisial(nama: string): string {
    const kata = nama.trim().split(/\s+/).filter(Boolean);
    if (kata.length === 0) return "OT";
    if (kata.length === 1) return kata[0].slice(0, 2).toUpperCase();
    return `${kata[0][0]}${kata[1][0]}`.toUpperCase();
}

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

    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

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
        // setState terjadi setelah await di dalam fetchSlotsAndBookings.
        // eslint-disable-next-line react-hooks/set-state-in-effect, react-hooks/exhaustive-deps
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
                const res = await fetch("/api/booking-kunjungan", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ idSlot: selectedPaySlot }),
                }).then((r) => r.json());
                if (res.success) {
                    toast.success("Slot kedatangan untuk pembayaran langsung berhasil dipesan! Silakan datang ke Bendahara sesuai jadwal.");
                    setShowPaymentModal(false);
                    setSelectedPaySlot("");
                    fetchSlotsAndBookings();
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
                        : "Rencana setor tabungan tunai ke Bendahara")
            );
            if (setorBukti) {
                fd.append("bukti", setorBukti);
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
                fetchFamilyData();
            } else {
                toast.error(res.error || "Gagal mengirim pengajuan setoran.");
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

                        <button
                            onClick={() => toast.info("Tidak ada pemberitahuan baru")}
                            aria-label="Pemberitahuan"
                            className="w-10 h-10 rounded-xl bg-teal-800/80 hover:bg-teal-700 flex items-center justify-center text-white transition cursor-pointer relative shadow-xs"
                        >
                            <Bell className="w-5 h-5" />
                            <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-amber-400 rounded-full"></span>
                        </button>

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
                            <span>Anak &amp; Pendaftaran</span>
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
                        <span>Tagihan &amp; Pembayaran</span>
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
                                    <h1 className="text-xl font-bold text-slate-900">Anak &amp; Pendaftaran</h1>
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
                                            <th className="p-5">STATUS</th>
                                            <th className="p-5">BERKAS ANAK</th>
                                            <th className="p-5 text-right">AKSI</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 text-slate-700">
                                        {familyChildren.length === 0 ? (
                                            <tr>
                                                <td colSpan={7} className="p-6 text-center text-slate-400">
                                                    Belum ada anak terdaftar. Klik &quot;+ Tambah Anak Baru&quot; untuk mendaftar.
                                                </td>
                                            </tr>
                                        ) : (
                                            familyChildren.map((ch) => (
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
                                                        <span className="px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full font-bold text-[10px]">
                                                            {ch.status}
                                                        </span>
                                                    </td>
                                                    <td className="p-5">
                                                        <div className="flex flex-wrap gap-1.5">
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
                                                                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-teal-50 text-[#095c51] hover:bg-teal-100 rounded-lg font-semibold text-[10px] cursor-pointer transition"
                                                                    >
                                                                        <Eye className="w-3 h-3" />
                                                                        <span>{item.label}</span>
                                                                    </button>
                                                                ) : (
                                                                    <span
                                                                        key={item.key}
                                                                        className="px-2 py-1 bg-slate-100 text-slate-400 rounded-lg text-[10px]"
                                                                    >
                                                                        {item.label} —
                                                                    </span>
                                                                );
                                                            })}
                                                        </div>
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
                                            ))
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
                                        <span>Kembali ke Anak &amp; Pendaftaran</span>
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
                                            TK ISLAM NUR HABIB · PROFIL &amp; RAPOT PESERTA DIDIK
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
                                                    Akademik &amp; Keuangan
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
                                                    <div className="flex justify-between gap-4">
                                                        <dt className="text-slate-500">Status Pembayaran</dt>
                                                        <dd className="font-bold text-slate-800 text-right">
                                                            {detailChild.sppStatus}
                                                            {totalTunggakan > 0 && (
                                                                <span className="block text-[11px] text-rose-600">
                                                                    Tagihan: Rp {totalTunggakan.toLocaleString("id-ID")}
                                                                </span>
                                                            )}
                                                        </dd>
                                                    </div>
                                                    <div className="flex justify-between gap-4">
                                                        <dt className="text-slate-500">Saldo Tabungan</dt>
                                                        <dd className="font-bold text-slate-900 text-right">
                                                            Rp {Number(detailChild.savingsBalance || 0).toLocaleString("id-ID")}
                                                        </dd>
                                                    </div>
                                                    <div className="flex justify-between gap-4">
                                                        <dt className="text-slate-500">Status Verifikasi Berkas</dt>
                                                        <dd className="font-bold text-slate-800 text-right">
                                                            {detailChild.berkasAnak?.statusVerifikasi || "MENUNGGU"}
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

                    {/* TAB: TAGIHAN & PEMBAYARAN */}
                    {activeTab === "payments" && (
                        <div className="space-y-6">
                            <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                                <div>
                                    <h1 className="text-xl font-bold text-slate-900">Tagihan &amp; Pembayaran</h1>
                                    <p className="text-xs text-slate-500 mt-1">
                                        Bayar tagihan via Transfer Bank atau pilih slot kedatangan untuk bayar langsung di sekolah.
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
                                        <span>Bayar / Unggah Bukti</span>
                                    </button>
                                    <button
                                        onClick={() => {
                                            setPaymentMode("LANGSUNG");
                                            setShowPaymentModal(true);
                                        }}
                                        className="px-5 py-3 bg-amber-400 hover:bg-amber-500 text-slate-900 rounded-2xl font-bold text-xs transition shadow-sm cursor-pointer flex items-center space-x-2"
                                    >
                                        <Calendar className="w-4 h-4" />
                                        <span>Booking Kedatangan Bayar Langsung</span>
                                    </button>
                                </div>
                            </div>

                            {/* Daftar Tagihan */}
                            <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs overflow-x-auto">
                                <table className="w-full text-xs text-left">
                                    <thead>
                                        <tr className="border-b border-slate-100 text-slate-400 font-semibold bg-slate-50/50">
                                            <th className="p-5">ANAK</th>
                                            <th className="p-5">TAGIHAN</th>
                                            <th className="p-5">NOMINAL</th>
                                            <th className="p-5">STATUS</th>
                                            <th className="p-5">METODE</th>
                                            <th className="p-5 text-right">AKSI</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 text-slate-700">
                                        {familyChildren.flatMap((child) => child.tagihan || []).length === 0 ? (
                                            <tr>
                                                <td colSpan={6} className="p-6 text-center text-slate-400">
                                                    Belum ada data tagihan di database.
                                                </td>
                                            </tr>
                                        ) : (
                                            familyChildren.flatMap((child) =>
                                                (child.tagihan || []).map((t: any) => {
                                                    const nominalAsli = Number(t.nominal || 0);
                                                    const diskon = Number(t.diskon || 0);
                                                    const totalBayar = Math.max(0, nominalAsli - diskon);
                                                    const labelJenis =
                                                        t.jenis === "PENDAFTARAN"
                                                            ? "Biaya Pendaftaran PPDB"
                                                            : t.jenis === "SPP" && t.bulan
                                                                ? `SPP Bulan ke-${t.bulan}`
                                                                : t.jenis;

                                                    return (
                                                    <tr key={t.idTagihan} className="hover:bg-slate-50/50 transition">
                                                        <td className="p-5 font-bold text-slate-900">{child.name}</td>
                                                        <td className="p-5 font-medium">{labelJenis}</td>
                                                        <td className="p-5 font-bold">
                                                            Rp {totalBayar.toLocaleString("id-ID")}
                                                            {diskon > 0 && (
                                                                <span className="block text-[10px] font-normal text-emerald-700">
                                                                    Normal Rp {nominalAsli.toLocaleString("id-ID")} (Diskon Rp{" "}
                                                                    {diskon.toLocaleString("id-ID")})
                                                                </span>
                                                            )}
                                                        </td>
                                                        <td className="p-5">
                                                            <span
                                                                className={`px-2.5 py-1 rounded-md font-bold text-[10px] ${
                                                                    t.status === "LUNAS"
                                                                        ? "bg-emerald-100 text-emerald-800"
                                                                        : t.status === "MENUNGGU_VERIFIKASI"
                                                                            ? "bg-amber-100 text-amber-800"
                                                                            : "bg-rose-100 text-rose-700"
                                                                }`}
                                                            >
                                                                {t.status === "LUNAS"
                                                                    ? "Lunas"
                                                                    : t.status === "MENUNGGU_VERIFIKASI"
                                                                        ? "Menunggu Verifikasi"
                                                                        : "Belum Dibayar"}
                                                            </span>
                                                        </td>
                                                        <td className="p-5 text-slate-500">
                                                            {t.pembayaran?.[0]?.metode || "-"}
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
                                                                    Bayar Sekarang
                                                                </button>
                                                            )}
                                                        </td>
                                                    </tr>
                                                    );
                                                })
                                            )
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

                                {bookingList.filter((b) => b.status !== "DIBATALKAN").length > 0 && (
                                    <div className="p-6 border-b border-slate-100 bg-teal-50/40 space-y-2">
                                        <div className="text-xs font-bold text-[#095c51]">Jadwal Kedatangan Anda:</div>
                                        <div className="space-y-2">
                                            {bookingList
                                                .filter((b) => b.status !== "DIBATALKAN")
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
                                                        {(b.status === "MENUNGGU" || b.status === "DIKONFIRMASI") && (
                                                            <button
                                                                onClick={() => handleBatalBooking(b.idBooking)}
                                                                className="text-rose-600 font-bold hover:underline cursor-pointer"
                                                            >
                                                                Batalkan
                                                            </button>
                                                        )}
                                                    </div>
                                                ))}
                                        </div>
                                    </div>
                                )}

                                <div className="p-6">
                                    <div className="text-xs font-bold text-slate-700 mb-3">
                                        Slot Waktu Kedatangan Tersedia:
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
                                                    (b) => b.slot.idSlot === s.idSlot && b.status !== "DIBATALKAN"
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
                                                                    body: JSON.stringify({ idSlot: s.idSlot }),
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
                    )}

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
                                        <span>+ Setor Tabungan (via Bendahara)</span>
                                    </button>
                                    <button
                                        onClick={() =>
                                            toast.info(
                                                "Untuk penarikan tabungan, silakan menghubungi Bendahara Sekolah secara langsung."
                                            )
                                        }
                                        className="px-5 py-2.5 bg-teal-800 hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition cursor-pointer border border-teal-600 flex items-center space-x-2"
                                    >
                                        <ArrowRight className="w-4 h-4" />
                                        <span>Ajukan Penarikan</span>
                                    </button>
                                </div>
                            </div>

                            {/* Riwayat Mutasi Tabungan */}
                            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
                                <div className="flex justify-between items-center pb-3 border-b border-slate-100">
                                    <h2 className="text-sm font-bold text-slate-900">Riwayat Mutasi Tabungan</h2>
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

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
                                    <div className="flex justify-between items-center">
                                        <h2 className="text-sm font-bold text-slate-900">Kartu Keluarga (KK)</h2>
                                        <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-md font-bold text-[10px]">
                                            {berkasKKRow?.statusVerifikasi || (fileKKName ? "Tersimpan" : "Belum Ada")}
                                        </span>
                                    </div>
                                    <p className="text-xs text-slate-500 truncate">
                                        Saat ini:{" "}
                                        <span className="font-semibold text-slate-800">
                                            {fileKKName || "Belum diunggah"}
                                        </span>
                                    </p>
                                    <div className="flex gap-2">
                                        <button
                                            disabled={!fileKKName}
                                            onClick={() =>
                                                fileKKName &&
                                                setPreviewBerkas({
                                                    label: "Kartu Keluarga (KK)",
                                                    url: keUrlBerkas(fileKKName),
                                                    isPdf: String(fileKKName).toLowerCase().endsWith(".pdf"),
                                                })
                                            }
                                            className="flex-1 px-3 py-2 bg-[#095c51] text-white rounded-xl text-xs font-bold hover:bg-[#074840] transition disabled:opacity-40 cursor-pointer flex items-center justify-center gap-1.5"
                                        >
                                            <Eye className="w-3.5 h-3.5" />
                                            <span>Lihat Preview</span>
                                        </button>
                                        <label className="flex-1 px-3 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold text-center transition cursor-pointer shadow-xs">
                                            Unggah KK baru
                                            <input
                                                type="file"
                                                className="hidden"
                                                accept=".jpg,.jpeg,.png,.pdf"
                                                onChange={(e) => {
                                                    const f = e.target.files?.[0];
                                                    if (f) handleUploadBerkasKeluarga("KK", f);
                                                }}
                                            />
                                        </label>
                                    </div>
                                </div>

                                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
                                    <div className="flex justify-between items-center">
                                        <h2 className="text-sm font-bold text-slate-900">KTP Orang Tua / Wali</h2>
                                        <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-md font-bold text-[10px]">
                                            {berkasKTPRow?.statusVerifikasi || (fileKTPName ? "Tersimpan" : "Belum Ada")}
                                        </span>
                                    </div>
                                    <p className="text-xs text-slate-500 truncate">
                                        Saat ini:{" "}
                                        <span className="font-semibold text-slate-800">
                                            {fileKTPName || "Belum diunggah"}
                                        </span>
                                    </p>
                                    <div className="flex gap-2">
                                        <button
                                            disabled={!fileKTPName}
                                            onClick={() =>
                                                fileKTPName &&
                                                setPreviewBerkas({
                                                    label: "KTP Orang Tua / Wali",
                                                    url: keUrlBerkas(fileKTPName),
                                                    isPdf: String(fileKTPName).toLowerCase().endsWith(".pdf"),
                                                })
                                            }
                                            className="flex-1 px-3 py-2 bg-[#095c51] text-white rounded-xl text-xs font-bold hover:bg-[#074840] transition disabled:opacity-40 cursor-pointer flex items-center justify-center gap-1.5"
                                        >
                                            <Eye className="w-3.5 h-3.5" />
                                            <span>Lihat Preview</span>
                                        </button>
                                        <label className="flex-1 px-3 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold text-center transition cursor-pointer shadow-xs">
                                            Unggah KTP baru
                                            <input
                                                type="file"
                                                className="hidden"
                                                accept=".jpg,.jpeg,.png,.pdf"
                                                onChange={(e) => {
                                                    const f = e.target.files?.[0];
                                                    if (f) handleUploadBerkasKeluarga("KTP_ORTU", f);
                                                }}
                                            />
                                        </label>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </main>
            </div>

            {/* MODAL KONFIRMASI PEMBAYARAN / BOOKING KEDATANGAN BAYAR LANGSUNG */}
            {showPaymentModal && (
                <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl w-full max-w-lg p-8 shadow-2xl border border-slate-100 space-y-5 relative max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center border-b border-slate-100 pb-4">
                            <h2 className="text-base font-bold text-slate-900">Pembayaran Tagihan</h2>
                            <button
                                onClick={() => setShowPaymentModal(false)}
                                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 cursor-pointer"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Pilih Metode: Transfer atau Datang Langsung */}
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                type="button"
                                onClick={() => setPaymentMode("TRANSFER")}
                                className={`p-3 rounded-2xl border text-left transition cursor-pointer ${
                                    paymentMode === "TRANSFER"
                                        ? "border-[#095c51] bg-teal-50/70 ring-2 ring-[#095c51]/20"
                                        : "border-slate-200 hover:bg-slate-50"
                                }`}
                            >
                                <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                                    <CreditCard className="w-4 h-4 text-[#095c51]" />
                                    <span>Transfer Bank</span>
                                </div>
                                <div className="text-[11px] text-slate-500 mt-1">Unggah bukti transfer.</div>
                            </button>

                            <button
                                type="button"
                                onClick={() => setPaymentMode("LANGSUNG")}
                                className={`p-3 rounded-2xl border text-left transition cursor-pointer ${
                                    paymentMode === "LANGSUNG"
                                        ? "border-[#095c51] bg-teal-50/70 ring-2 ring-[#095c51]/20"
                                        : "border-slate-200 hover:bg-slate-50"
                                }`}
                            >
                                <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                                    <Building2 className="w-4 h-4 text-[#095c51]" />
                                    <span>Bayar Langsung</span>
                                </div>
                                <div className="text-[11px] text-slate-500 mt-1">Pilih slot kedatangan ke sekolah.</div>
                            </button>
                        </div>

                        {paymentMode === "TRANSFER" ? (
                            <>
                                <div className="p-4 bg-teal-50/60 border border-teal-200 rounded-2xl space-y-1">
                                    <div className="text-[11px] font-bold text-[#095c51] uppercase tracking-wider">
                                        REKENING PEMBAYARAN SEKOLAH
                                    </div>
                                    <div className="text-xs font-bold text-slate-900">
                                        BSI 7123-4567-89 a/n TK Islam Nur Habib
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="block text-xs font-bold text-slate-700">Pilih Tagihan</label>
                                    <select
                                        value={selectedTagihan}
                                        onChange={(e) => setSelectedTagihan(e.target.value)}
                                        className="w-full px-4 py-3 rounded-xl border border-slate-200 text-xs focus:outline-none bg-white font-medium cursor-pointer"
                                    >
                                        <option value="">-- Pilih Tagihan Belum Lunas --</option>
                                        {familyChildren.flatMap((child) =>
                                            (child.tagihan || [])
                                                .filter((t: any) => t.status === "BELUM_BAYAR")
                                                .map((t: any) => {
                                                    const totalBayar = Math.max(
                                                        0,
                                                        Number(t.nominal || 0) - Number(t.diskon || 0)
                                                    );
                                                    const labelJenis =
                                                        t.jenis === "PENDAFTARAN" ? "Biaya Pendaftaran PPDB" : t.jenis;
                                                    return (
                                                        <option key={t.idTagihan} value={t.idTagihan}>
                                                            {child.name} - {labelJenis} (Rp{" "}
                                                            {totalBayar.toLocaleString("id-ID")})
                                                        </option>
                                                    );
                                                })
                                        )}
                                    </select>
                                </div>

                                <div className="space-y-2">
                                    <label className="block text-xs font-bold text-slate-700">Unggah Bukti Transfer</label>
                                    <div className="p-4 border border-dashed border-slate-300 rounded-2xl bg-slate-50 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-slate-100 transition relative">
                                        <input
                                            type="file"
                                            accept=".jpg,.jpeg,.png,.pdf"
                                            onChange={(e) => e.target.files && setBuktiTransfer(e.target.files[0])}
                                            className="absolute inset-0 opacity-0 cursor-pointer"
                                        />
                                        <div className="text-xs font-medium text-slate-600">
                                            {buktiTransfer ? (
                                                <span className="text-emerald-600 font-bold">{buktiTransfer.name}</span>
                                            ) : (
                                                "Klik untuk memilih file bukti transfer (JPG/PNG/PDF)"
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className="space-y-3">
                                <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-900">
                                    Pilih slot tanggal dan waktu kedatangan ke sekretariat / bendahara sekolah untuk melakukan pembayaran secara langsung.
                                </div>

                                {slotList.length === 0 ? (
                                    <div className="p-4 rounded-xl bg-slate-50 text-xs text-slate-500 text-center">
                                        Belum ada slot kedatangan yang tersedia.
                                    </div>
                                ) : (
                                    <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                                        {slotList.map((s) => {
                                            const penuh = s.sisa === 0;
                                            const terpilih = selectedPaySlot === s.idSlot;
                                            return (
                                                <button
                                                    key={s.idSlot}
                                                    type="button"
                                                    disabled={penuh}
                                                    onClick={() => setSelectedPaySlot(s.idSlot)}
                                                    className={`w-full p-3.5 rounded-2xl border text-left flex items-center justify-between transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                                                        terpilih
                                                            ? "border-[#095c51] bg-teal-50 ring-2 ring-[#095c51]/20"
                                                            : "border-slate-200 hover:bg-slate-50"
                                                    }`}
                                                >
                                                    <div>
                                                        <div className="text-xs font-bold text-slate-900">
                                                            {formatTanggalSlot(s.tanggal)}
                                                        </div>
                                                        <div className="text-[11px] text-[#095c51] font-semibold flex items-center gap-1 mt-0.5">
                                                            <Clock className="w-3 h-3" />
                                                            <span>Pukul {formatJamSlot(s.jam)} WIB</span>
                                                        </div>
                                                    </div>
                                                    <span className="text-[11px] font-bold text-slate-600">
                                                        {penuh ? "Penuh" : `Sisa ${s.sisa}/${s.kuota}`}
                                                    </span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="flex justify-end items-center space-x-3 pt-4 border-t border-slate-100">
                            <button
                                onClick={() => setShowPaymentModal(false)}
                                className="px-5 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold cursor-pointer transition"
                            >
                                Batal
                            </button>
                            <button
                                disabled={isSubmitting}
                                onClick={handleKirimPembayaran}
                                className="px-6 py-2.5 bg-[#009688] hover:bg-[#00796b] text-white rounded-xl text-xs font-bold cursor-pointer shadow-sm transition disabled:opacity-50"
                            >
                                {isSubmitting
                                    ? "Memproses..."
                                    : paymentMode === "TRANSFER"
                                        ? "Kirim Bukti Pembayaran"
                                        : "Booking Slot Kedatangan"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL SETOR TABUNGAN (TERHUBUNG KE BENDAHARA) */}
            {showSetorModal && (
                <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
                    <form
                        onSubmit={handleKirimSetorTabungan}
                        className="bg-white rounded-3xl w-full max-w-lg p-8 shadow-2xl border border-slate-100 space-y-5 relative"
                    >
                        <div className="flex justify-between items-center border-b border-slate-100 pb-4">
                            <div>
                                <h2 className="text-base font-bold text-slate-900">Setor Tabungan Siswa</h2>
                                <p className="text-xs text-slate-500 mt-0.5">
                                    Pengajuan setoran akan langsung masuk ke antrean verifikasi Bendahara.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowSetorModal(false)}
                                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 cursor-pointer"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1.5">Pilih Anak</label>
                                <select
                                    value={setorAnakId}
                                    onChange={(e) => setSetorAnakId(e.target.value)}
                                    required
                                    className="w-full px-4 py-3 rounded-xl border border-slate-200 text-xs bg-white"
                                >
                                    {familyChildren.map((ch) => (
                                        <option key={ch.id} value={ch.id}>
                                            {ch.name} ({ch.group})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                                    Nominal Setoran (Rp)
                                </label>
                                <input
                                    type="number"
                                    min={1000}
                                    step={500}
                                    value={setorNominal}
                                    onChange={(e) => setSetorNominal(e.target.value)}
                                    placeholder="Contoh: 50000"
                                    required
                                    className="w-full px-4 py-3 rounded-xl border border-slate-200 text-xs"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1.5">Metode Setoran</label>
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setSetorMetode("TRANSFER")}
                                        className={`p-3 rounded-xl border text-xs font-bold cursor-pointer ${
                                            setorMetode === "TRANSFER"
                                                ? "border-[#095c51] bg-teal-50 text-[#095c51]"
                                                : "border-slate-200 text-slate-600"
                                        }`}
                                    >
                                        Transfer Bank
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setSetorMetode("TUNAI")}
                                        className={`p-3 rounded-xl border text-xs font-bold cursor-pointer ${
                                            setorMetode === "TUNAI"
                                                ? "border-[#095c51] bg-teal-50 text-[#095c51]"
                                                : "border-slate-200 text-slate-600"
                                        }`}
                                    >
                                        Tunai ke Bendahara
                                    </button>
                                </div>
                            </div>

                            {setorMetode === "TRANSFER" && (
                                <>
                                    <div className="p-3 bg-teal-50/70 border border-teal-200 rounded-xl text-xs text-slate-700">
                                        Rekening Tabungan Sekolah: <strong>BSI 7123-4567-89 a/n TK Islam Nur Habib</strong>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 mb-1.5">
                                            Unggah Bukti Transfer *
                                        </label>
                                        <div className="p-4 border border-dashed border-slate-300 rounded-xl bg-slate-50 text-center relative cursor-pointer">
                                            <input
                                                type="file"
                                                accept=".jpg,.jpeg,.png,.pdf"
                                                onChange={(e) => e.target.files && setSetorBukti(e.target.files[0])}
                                                className="absolute inset-0 opacity-0 cursor-pointer"
                                            />
                                            <span className="text-xs text-slate-600">
                                                {setorBukti ? (
                                                    <strong className="text-emerald-700">{setorBukti.name}</strong>
                                                ) : (
                                                    "Pilih file bukti transfer (JPG/PNG/PDF)"
                                                )}
                                            </span>
                                        </div>
                                    </div>
                                </>
                            )}

                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                                    Keterangan (Opsional)
                                </label>
                                <input
                                    type="text"
                                    value={setorKeterangan}
                                    onChange={(e) => setSetorKeterangan(e.target.value)}
                                    placeholder="Contoh: Tabungan mingguan"
                                    className="w-full px-4 py-3 rounded-xl border border-slate-200 text-xs"
                                />
                            </div>
                        </div>

                        <div className="flex justify-end space-x-3 pt-4 border-t border-slate-100">
                            <button
                                type="button"
                                onClick={() => setShowSetorModal(false)}
                                className="px-5 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold cursor-pointer"
                            >
                                Batal
                            </button>
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="px-6 py-2.5 bg-[#095c51] hover:bg-[#074840] text-white rounded-xl text-xs font-bold cursor-pointer disabled:opacity-50"
                            >
                                {isSubmitting ? "Mengirim..." : "Kirim ke Bendahara"}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* MODAL TAMBAH ANAK BARU (PPDB) */}
            {showAddChildModal && (
                <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl w-full max-w-xl p-8 shadow-2xl border border-slate-100 space-y-6 relative max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center border-b border-slate-100 pb-4">
                            <div>
                                <h2 className="text-lg font-bold text-slate-900">Formulir Pendaftaran Anak Baru</h2>
                                <p className="text-xs text-slate-400">
                                    Lengkapi data anak, semua berkas wajib, dan jalur kedatangan.
                                </p>
                            </div>
                            <button
                                onClick={() => setShowAddChildModal(false)}
                                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 font-bold cursor-pointer"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="flex items-center space-x-4 border-b border-slate-100 pb-4">
                            <div
                                className={`flex items-center space-x-2 text-xs font-bold ${
                                    modalStep === 1 ? "text-[#095c51]" : "text-slate-400"
                                }`}
                            >
                                <span
                                    className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] ${
                                        modalStep === 1 ? "bg-teal-100 text-[#095c51]" : "bg-slate-100"
                                    }`}
                                >
                                    1
                                </span>
                                <span>Data Anak</span>
                            </div>
                            <div
                                className={`flex items-center space-x-2 text-xs font-bold ${
                                    modalStep === 2 ? "text-[#095c51]" : "text-slate-400"
                                }`}
                            >
                                <span
                                    className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] ${
                                        modalStep === 2 ? "bg-teal-100 text-[#095c51]" : "bg-slate-100"
                                    }`}
                                >
                                    2
                                </span>
                                <span>Berkas Anak</span>
                            </div>
                            <div
                                className={`flex items-center space-x-2 text-xs font-bold ${
                                    modalStep === 3 ? "text-[#095c51]" : "text-slate-400"
                                }`}
                            >
                                <span
                                    className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] ${
                                        modalStep === 3 ? "bg-teal-100 text-[#095c51]" : "bg-slate-100"
                                    }`}
                                >
                                    3
                                </span>
                                <span>Jalur PPDB</span>
                            </div>
                        </div>

                        {modalStep === 1 && (
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                                        Nama Lengkap Calon Siswa <span className="text-rose-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="Contoh: Muhammad Ali"
                                        value={namaAnak}
                                        onChange={(e) => setNamaAnak(e.target.value)}
                                        className="w-full px-4 py-3 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-[#095c51]/20 focus:border-[#095c51]"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 mb-1.5">
                                            Tanggal Lahir <span className="text-rose-500">*</span>
                                        </label>
                                        <input
                                            type="date"
                                            value={tglLahirAnak}
                                            onChange={(e) => setTglLahirAnak(e.target.value)}
                                            className="w-full px-4 py-3 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-[#095c51]/20 focus:border-[#095c51]"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 mb-1.5">
                                            Jenis Kelamin
                                        </label>
                                        <select
                                            value={jenisKelamin}
                                            onChange={(e) => setJenisKelamin(e.target.value)}
                                            className="w-full px-4 py-3 rounded-xl border border-slate-200 text-xs focus:outline-none bg-white cursor-pointer"
                                        >
                                            <option value="Laki-laki">Laki-laki</option>
                                            <option value="Perempuan">Perempuan</option>
                                        </select>
                                    </div>
                                </div>

                                {tglLahirAnak && (
                                    <div
                                        className={`p-3.5 rounded-2xl border text-xs flex items-start space-x-2.5 ${
                                            infoKelompokCalon
                                                ? "bg-teal-50 border-teal-200 text-[#095c51]"
                                                : "bg-rose-50 border-rose-200 text-rose-700"
                                        }`}
                                    >
                                        <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                                        <div>
                                            {infoKelompokCalon ? (
                                                <>
                                                    <div className="font-bold">
                                                        Kelompok Otomatis: {infoKelompokCalon.labelLengkap}
                                                    </div>
                                                    <div className="text-[11px] opacity-80 mt-0.5">
                                                        Usia dihitung per 1 Juli 2026: {infoKelompokCalon.usia} tahun
                                                        (KB: 3–4 th, TK A: 4–5 th, TK B: 5–6 th).
                                                    </div>
                                                </>
                                            ) : (
                                                <div className="font-bold">
                                                    Usia anak di luar rentang standar KB/TK (3–6 tahun).
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                <div>
                                    <div className="flex justify-between items-center mb-1.5">
                                        <label className="block text-xs font-bold text-slate-700">
                                            NIK (Sesuai Kartu Keluarga) <span className="text-rose-500">*</span>
                                        </label>
                                        <span
                                            className={`text-[11px] font-semibold ${
                                                nikAnak.length === 16 ? "text-emerald-600" : "text-slate-400"
                                            }`}
                                        >
                                            {nikAnak.length}/16 digit
                                        </span>
                                    </div>
                                    <input
                                        type="text"
                                        inputMode="numeric"
                                        maxLength={16}
                                        placeholder="Masukkan tepat 16 digit angka NIK"
                                        value={nikAnak}
                                        onChange={(e) => setNikAnak(e.target.value.replace(/\D/g, "").slice(0, 16))}
                                        className="w-full px-4 py-3 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-[#095c51]/20 focus:border-[#095c51]"
                                    />
                                </div>
                            </div>
                        )}

                        {modalStep === 2 && (
                            <div className="space-y-4">
                                <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start space-x-3">
                                    <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                                    <p className="text-xs text-amber-800 font-medium">
                                        Semua berkas anak (Akta Kelahiran, Pas Foto 3x4, dan KIA) wajib diisi untuk melanjutkan pendaftaran.
                                    </p>
                                </div>

                                <div className="p-4 bg-white border border-slate-200 rounded-2xl flex items-center justify-between gap-3 shadow-xs">
                                    <div className="flex items-center space-x-3 min-w-0">
                                        <div className="w-10 h-10 rounded-xl bg-teal-50 text-[#095c51] flex items-center justify-center shrink-0">
                                            <FileText className="w-5 h-5" />
                                        </div>
                                        <div className="min-w-0">
                                            <div className="text-xs font-bold text-slate-900">
                                                Fotokopi Akta Kelahiran <span className="text-rose-500">*</span>
                                            </div>
                                            <div className="text-[11px] text-slate-400 truncate">
                                                {fileAkta ? (
                                                    <span className="text-emerald-600 font-semibold">{fileAkta.name}</span>
                                                ) : (
                                                    "Wajib · Format PDF/JPG/PNG, maks 5 MB"
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                        {fileAkta && (
                                            <button
                                                type="button"
                                                onClick={() => previewFileLokal("Preview Akta Kelahiran", fileAkta)}
                                                className="px-3 py-2 bg-teal-50 text-[#095c51] rounded-xl text-xs font-bold cursor-pointer inline-flex items-center gap-1"
                                            >
                                                <Eye className="w-3.5 h-3.5" />
                                                <span>Preview</span>
                                            </button>
                                        )}
                                        <label className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer shadow-xs">
                                            Pilih File
                                            <input
                                                type="file"
                                                className="hidden"
                                                accept=".pdf,.jpg,.jpeg,.png"
                                                onChange={(e) => e.target.files?.[0] && setFileAkta(e.target.files[0])}
                                            />
                                        </label>
                                    </div>
                                </div>

                                <div className="p-4 bg-white border border-slate-200 rounded-2xl flex items-center justify-between gap-3 shadow-xs">
                                    <div className="flex items-center space-x-3 min-w-0">
                                        <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                                            <ImageIcon className="w-5 h-5" />
                                        </div>
                                        <div className="min-w-0">
                                            <div className="text-xs font-bold text-slate-900">
                                                Pas Foto Anak (3x4) <span className="text-rose-500">*</span>
                                            </div>
                                            <div className="text-[11px] text-slate-400 truncate">
                                                {fileFoto ? (
                                                    <span className="text-emerald-600 font-semibold">{fileFoto.name}</span>
                                                ) : (
                                                    "Wajib · Foto berlatar belakang merah/biru"
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                        {fileFoto && (
                                            <button
                                                type="button"
                                                onClick={() => previewFileLokal("Preview Pas Foto Anak", fileFoto)}
                                                className="px-3 py-2 bg-teal-50 text-[#095c51] rounded-xl text-xs font-bold cursor-pointer inline-flex items-center gap-1"
                                            >
                                                <Eye className="w-3.5 h-3.5" />
                                                <span>Preview</span>
                                            </button>
                                        )}
                                        <label className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer shadow-xs">
                                            Pilih File
                                            <input
                                                type="file"
                                                className="hidden"
                                                accept=".jpg,.jpeg,.png"
                                                onChange={(e) => e.target.files?.[0] && setFileFoto(e.target.files[0])}
                                            />
                                        </label>
                                    </div>
                                </div>

                                <div className="p-4 bg-white border border-slate-200 rounded-2xl flex items-center justify-between gap-3 shadow-xs">
                                    <div className="flex items-center space-x-3 min-w-0">
                                        <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                                            <IdCard className="w-5 h-5" />
                                        </div>
                                        <div className="min-w-0">
                                            <div className="text-xs font-bold text-slate-900">
                                                Kartu Identitas Anak (KIA) <span className="text-rose-500">*</span>
                                            </div>
                                            <div className="text-[11px] text-slate-400 truncate">
                                                {fileKia ? (
                                                    <span className="text-emerald-600 font-semibold">{fileKia.name}</span>
                                                ) : (
                                                    "Wajib · Format PDF/JPG/PNG, maks 5 MB"
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                        {fileKia && (
                                            <button
                                                type="button"
                                                onClick={() => previewFileLokal("Preview KIA", fileKia)}
                                                className="px-3 py-2 bg-teal-50 text-[#095c51] rounded-xl text-xs font-bold cursor-pointer inline-flex items-center gap-1"
                                            >
                                                <Eye className="w-3.5 h-3.5" />
                                                <span>Preview</span>
                                            </button>
                                        )}
                                        <label className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer shadow-xs">
                                            Pilih File
                                            <input
                                                type="file"
                                                className="hidden"
                                                accept=".pdf,.jpg,.jpeg,.png"
                                                onChange={(e) => e.target.files?.[0] && setFileKia(e.target.files[0])}
                                            />
                                        </label>
                                    </div>
                                </div>
                            </div>
                        )}

                        {modalStep === 3 && (
                            <div className="space-y-4">
                                <label className="block text-xs font-bold text-slate-700">Pilih Metode Pendaftaran</label>
                                <div className="grid grid-cols-2 gap-4">
                                    <div
                                        onClick={() => setJalurPendaftaran("Daring")}
                                        className={`p-4 rounded-2xl border cursor-pointer transition ${
                                            jalurPendaftaran === "Daring"
                                                ? "border-[#095c51] bg-teal-50/50 ring-2 ring-[#095c51]/20"
                                                : "border-slate-200"
                                        }`}
                                    >
                                        <div className="text-xs font-bold text-slate-900">100% Daring (Online)</div>
                                        <p className="text-[11px] text-slate-500 mt-1">
                                            Verifikasi berkas &amp; pembayaran dilakukan sepenuhnya melalui website.
                                        </p>
                                    </div>
                                    <div
                                        onClick={() => setJalurPendaftaran("Onsite")}
                                        className={`p-4 rounded-2xl border cursor-pointer transition ${
                                            jalurPendaftaran === "Onsite"
                                                ? "border-[#095c51] bg-teal-50/50 ring-2 ring-[#095c51]/20"
                                                : "border-slate-200"
                                        }`}
                                    >
                                        <div className="text-xs font-bold text-slate-900">Datang Langsung (Onsite)</div>
                                        <p className="text-[11px] text-slate-500 mt-1">
                                            Pilih slot kedatangan ke sekretariat sekolah untuk penyerahan berkas &amp; pembayaran langsung.
                                        </p>
                                    </div>
                                </div>

                                {jalurPendaftaran === "Onsite" && (
                                    <div className="space-y-2 pt-2">
                                        <label className="block text-xs font-bold text-slate-700">
                                            Pilih Slot Waktu Kedatangan
                                        </label>
                                        {slotList.length === 0 ? (
                                            <div className="p-3 bg-slate-50 rounded-xl text-xs text-slate-500">
                                                Belum ada slot jadwal tersedia.
                                            </div>
                                        ) : (
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-44 overflow-y-auto">
                                                {slotList.map((s) => {
                                                    const penuh = s.sisa === 0;
                                                    return (
                                                        <button
                                                            key={s.idSlot}
                                                            type="button"
                                                            disabled={penuh}
                                                            onClick={() => setSelectedOnsiteSlot(s.idSlot)}
                                                            className={`p-3 rounded-xl border text-left transition cursor-pointer disabled:opacity-40 ${
                                                                selectedOnsiteSlot === s.idSlot
                                                                    ? "border-[#095c51] bg-teal-50 ring-2 ring-[#095c51]/20"
                                                                    : "border-slate-200 hover:bg-slate-50"
                                                            }`}
                                                        >
                                                            <div className="text-xs font-bold text-slate-900">
                                                                {formatTanggalSlot(s.tanggal)}
                                                            </div>
                                                            <div className="text-[11px] text-[#095c51] font-semibold">
                                                                {formatJamSlot(s.jam)} WIB · Sisa {s.sisa}/{s.kuota}
                                                            </div>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="flex justify-between items-center pt-4 border-t border-slate-100">
                            {modalStep > 1 ? (
                                <button
                                    onClick={() => setModalStep(modalStep - 1)}
                                    className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer"
                                >
                                    Kembali
                                </button>
                            ) : (
                                <div />
                            )}

                            {modalStep < 3 ? (
                                <button
                                    onClick={handleLanjutStep}
                                    className="px-6 py-2.5 bg-[#095c51] hover:bg-[#074840] text-white rounded-xl text-xs font-bold cursor-pointer shadow-sm"
                                >
                                    Lanjut
                                </button>
                            ) : (
                                <button
                                    onClick={handleSaveNewChild}
                                    disabled={isSubmitting}
                                    className="px-6 py-2.5 bg-[#009688] hover:bg-[#00796b] text-white rounded-xl text-xs font-bold cursor-pointer shadow-sm disabled:opacity-50"
                                >
                                    {isSubmitting ? "Menyimpan..." : "Kirim Pendaftaran"}
                                </button>
                            )}
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
                                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 font-bold cursor-pointer"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="bg-slate-100 rounded-2xl min-h-[300px] flex items-center justify-center overflow-hidden">
                            {previewBerkas.isPdf || previewBerkas.url.toLowerCase().endsWith(".pdf") ? (
                                <iframe
                                    src={previewBerkas.url}
                                    className="w-full h-[60vh] border-0 rounded-xl"
                                    title={previewBerkas.label}
                                />
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
                                className="inline-flex items-center px-4 py-2 bg-[#095c51] text-white rounded-xl text-xs font-bold hover:bg-[#074840] transition"
                            >
                                <Download className="w-4 h-4 mr-1.5" />
                                <span>Unduh / Buka di Tab Baru</span>
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
        </div>
    );
}
