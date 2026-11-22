import React, { useState, useEffect } from 'react';
import { X, Save, User, Mail, GraduationCap, MapPin, Phone, Hash, ShieldCheck, Award, Crown, Lock } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Member, UserSession } from '../types';
import { useLanguage } from '../utils/i18n';
import { isHeadAdmin, getCanonicalRole } from '../utils/rbac';

interface MemberFormModalProps {
  isOpen: boolean;
  memberToEdit?: Member | null;
  initialData?: Member | null;
  onClose: () => void;
  onSave: (member: Member, originalNisn?: string) => Promise<void>;
  isSubmitting: boolean;
  session?: UserSession | null;
}

export const MemberFormModal: React.FC<MemberFormModalProps> = ({
  isOpen,
  memberToEdit,
  initialData,
  onClose,
  onSave,
  isSubmitting,
  session,
}) => {
  const { language } = useLanguage();
  const isEn = language === 'en';
  const activeMember = memberToEdit || initialData || null;

  const [formData, setFormData] = useState<Partial<Member>>({
    fullName: '',
    email: '',
    grade: 'X',
    classRoom: 'A',
    gender: 'Male',
    status: 'Aktif',
    nisn: '',
    nik: '',
    address: '',
    personalPhone: '',
    parentPhone: '',
    birthDate: '',
  });

  const [validationError, setValidationError] = useState('');

  useEffect(() => {
    if (activeMember) {
      setFormData({
        fullName: activeMember.fullName || '',
        email: activeMember.email || '',
        grade: activeMember.grade || 'X',
        classRoom: activeMember.classRoom || 'A',
        gender: activeMember.gender || 'Male',
        status: activeMember.status || 'Aktif',
        nisn: activeMember.nisn || '',
        nik: activeMember.nik || '',
        address: activeMember.address || '',
        personalPhone: activeMember.personalPhone || '',
        parentPhone: activeMember.parentPhone || '',
        birthDate: activeMember.birthDate || '',
        id_member: activeMember.id_member,
        role: activeMember.role,
        jabatan: activeMember.jabatan,
        timestamp: activeMember.timestamp,
      });
    } else {
      setFormData({
        fullName: '',
        email: '',
        grade: 'X',
        classRoom: 'A',
        gender: 'Male',
        status: 'Aktif',
        nisn: '',
        nik: '',
        address: '',
        personalPhone: '',
        parentPhone: '',
        birthDate: '',
        role: 'member',
        jabatan: 'member',
      });
    }
    setValidationError('');
  }, [memberToEdit, initialData, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError('');

    if (!formData.fullName?.trim()) {
      setValidationError(isEn ? 'Student full name is required!' : 'Nama lengkap siswa wajib diisi!');
      return;
    }
    if (!formData.nisn?.trim()) {
      setValidationError(isEn ? 'NISN is required!' : 'NISN wajib diisi!');
      return;
    }
    if (!formData.personalPhone?.trim()) {
      setValidationError(isEn ? 'WhatsApp / personal phone number is required!' : 'Nomor WhatsApp / HP siswa wajib diisi!');
      return;
    }

    const timestamp = activeMember?.timestamp || new Date().toLocaleString('en-US');
    const selectedJabatan = formData.jabatan || activeMember?.jabatan || 'member';

    // Strict Enforcement: Only Administrator can assign or modify the Advisor role
    const isSuperAdmin = Boolean(session && (isHeadAdmin(session) || getCanonicalRole(session) === 'admin'));
    if (selectedJabatan === 'advisor' && !isSuperAdmin) {
      setValidationError(isEn ? 'Only Administrator can assign the Advisor role!' : 'Hanya Administrator Utama yang berhak menetapkan peran Guru Pembina!');
      return;
    }

    const isExec = ['president', 'vice_president', 'secretary', 'treasurer', 'pr'].includes(selectedJabatan);
    const isAdvisor = selectedJabatan === 'advisor';
    const computedRole = formData.role || (isExec ? 'executive_board' : isAdvisor ? 'admin' : 'member');

    const completeMember: Member = {
      id_member: activeMember?.id_member,
      role: computedRole,
      jabatan: selectedJabatan,
      timestamp,
      email: formData.email?.trim() || '',
      fullName: formData.fullName.trim(),
      grade: formData.grade || 'X',
      classRoom: (formData.classRoom || 'A').toUpperCase().trim(),
      gender: formData.gender || 'Male',
      status: (formData.status as any) || (isExec ? 'executive_board' : 'Aktif'),
      nisn: formData.nisn.trim(),
      nik: formData.nik?.trim() || '',
      birthDate: formData.birthDate?.trim() || '',
      address: formData.address?.trim() || '',
      personalPhone: formData.personalPhone.trim(),
      parentPhone: formData.parentPhone?.trim() || '',
    };

    await onSave(completeMember, activeMember ? activeMember.nisn : undefined);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          className="bg-white border border-slate-200/90 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl my-auto max-h-[92vh] flex flex-col"
        >
          
          {/* Modal Header */}
          <div className="flex items-center justify-between px-5 sm:px-6 py-3.5 sm:py-4 border-b border-slate-100 bg-sky-50/50 shrink-0">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                {activeMember 
                  ? (isEn ? 'Edit Member Information' : 'Edit Informasi Anggota') 
                  : (isEn ? 'Enroll New Club Member' : 'Daftarkan Anggota Baru')}
              </h2>
              <p className="text-xs text-slate-500">
                {activeMember 
                  ? (isEn ? `Updating profile for ${activeMember.fullName}` : `Memperbarui profil untuk ${activeMember.fullName}`) 
                  : (isEn ? 'Register a new member to Robotic MAN 2 Kota Bekasi' : 'Pendaftaran anggota baru Klub Robotik MAN 2 Kota Bekasi')}
              </p>
            </div>
            
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Validation Error Alert */}
          {validationError && (
            <div className="mx-5 sm:mx-6 mt-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-semibold shrink-0">
              {validationError}
            </div>
          )}

          {/* Form Content */}
          <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 text-xs overflow-y-auto flex-1">
            
            {/* Row 1: Full Name & Gender */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2">
                <label className="block font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-slate-400" />
                  <span>{isEn ? 'Student Full Name *' : 'Nama Lengkap Siswa *'}</span>
                </label>
                <input
                  id="formFullName"
                  type="text"
                  required
                  placeholder={isEn ? "e.g. Muhammad Rayhan Pratama" : "Contoh: Muhammad Rayhan Pratama"}
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-blue-600 transition"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1.5">{isEn ? 'Gender' : 'Jenis Kelamin'}</label>
                <select
                  id="formGender"
                  value={formData.gender}
                  onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:bg-white focus:border-blue-600 transition"
                >
                  <option value="Male">{isEn ? 'Male (L)' : 'Laki-laki (L)'}</option>
                  <option value="Female">{isEn ? 'Female (P)' : 'Perempuan (P)'}</option>
                </select>
              </div>
            </div>

            {/* Row 2: Status & Grade */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block font-semibold text-slate-700 mb-1.5">{isEn ? 'Membership Status *' : 'Status Anggota *'}</label>
                <select
                  id="formStatus"
                  value={formData.status || 'Aktif'}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-xl font-bold focus:outline-none focus:bg-white transition ${
                    formData.status === 'Keluar'
                      ? 'bg-rose-50 border-rose-200 text-rose-700'
                      : formData.status === 'Alumni'
                        ? 'bg-purple-50 border-purple-200 text-purple-700'
                        : 'bg-emerald-50 border-emerald-200 text-emerald-700'
                  }`}
                >
                  <option value="Aktif">🟢 {isEn ? 'Active (Enrolled)' : 'Aktif (Terdaftar)'}</option>
                  <option value="Keluar">🔴 {isEn ? 'Resigned (Inactive)' : 'Keluar (Nonaktif)'}</option>
                  <option value="Alumni">🟣 {isEn ? 'Alumni (Graduated)' : 'Alumni (Lulus)'}</option>
                </select>
              </div>

              <div>
                <label className="flex items-center gap-1.5 font-semibold text-slate-700 mb-1.5">
                  <GraduationCap className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                  <span>{isEn ? 'Grade Level *' : 'Tingkat Kelas *'}</span>
                </label>
                <select
                  id="formGrade"
                  value={formData.grade}
                  onChange={(e) => setFormData({ ...formData, grade: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-semibold focus:outline-none focus:bg-white focus:border-blue-600 transition"
                >
                  <option value="X">{isEn ? 'Grade X (Tenth)' : 'Kelas X (Sepuluh)'}</option>
                  <option value="XI">{isEn ? 'Grade XI (Eleventh)' : 'Kelas XI (Sebelas)'}</option>
                  <option value="XII">{isEn ? 'Grade XII (Twelfth)' : 'Kelas XII (Dua Belas)'}</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1.5">{isEn ? 'Classroom / Section' : 'Ruang Kelas / Jurusan'}</label>
                <input
                  id="formClassRoom"
                  type="text"
                  placeholder={isEn ? "e.g. A, B, IPA 1" : "Contoh: A, B, IPA 1"}
                  value={formData.classRoom}
                  onChange={(e) => setFormData({ ...formData, classRoom: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 uppercase font-semibold focus:outline-none focus:bg-white focus:border-blue-600 transition"
                />
              </div>
            </div>

            {/* Row 2.5: Role & Position / Jabatan Ekstrakurikuler (RBAC) */}
            <div className="p-3.5 bg-indigo-50/70 border border-indigo-200/80 rounded-2xl space-y-2">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-1.5 font-bold text-indigo-950 text-xs">
                  <ShieldCheck className="w-4 h-4 text-indigo-600" />
                  <span>{isEn ? 'Extracurricular Role & Position (RBAC)' : 'Role & Jabatan Kepengurusan Ekstrakurikuler (RBAC)'}</span>
                </label>
                <span className="text-[10px] font-semibold text-indigo-700 bg-white px-2 py-0.5 rounded-md border border-indigo-200">
                  {formData.jabatan && formData.jabatan !== 'member' ? (isEn ? 'Executive Board Officer' : 'Pengurus Inti') : (isEn ? 'Regular Member' : 'Anggota Biasa')}
                </span>
              </div>

              {Boolean(activeMember?.jabatan === 'advisor' && !Boolean(session && (isHeadAdmin(session) || getCanonicalRole(session) === 'admin'))) ? (
                <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs flex items-center gap-2">
                  <Lock className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>
                    {isEn 
                      ? 'Protected Role: Faculty Advisor account can only be modified by the Primary Administrator.' 
                      : 'Peran Terlindungi: Akun Guru Pembina hanya dapat diubah oleh Administrator Utama.'}
                  </span>
                </div>
              ) : (
                <select
                  id="formJabatan"
                  value={formData.jabatan || 'member'}
                  onChange={(e) => {
                    const newJabatan = e.target.value;
                    const isExec = ['president', 'vice_president', 'secretary', 'treasurer', 'pr'].includes(newJabatan);
                    const isAdvisor = newJabatan === 'advisor';
                    setFormData({
                      ...formData,
                      jabatan: newJabatan,
                      role: isExec ? 'executive_board' : (isAdvisor ? 'admin' : 'member'),
                      status: isExec ? 'Aktif' : (formData.status || 'Aktif')
                    });
                  }}
                  className="w-full px-3 py-2 bg-white border border-indigo-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition shadow-2xs"
                >
                  <option value="member">👤 {isEn ? 'Club Member (General Member / Viewer)' : 'Anggota Biasa (Siswa Ekstrakurikuler)'}</option>
                  <option value="president">👑 {isEn ? 'President / Ketua Ekskul (Executive Board & Full Authority)' : 'Ketua Ekskul / President (Pengurus Inti & Akses Penuh)'}</option>
                  <option value="vice_president">⭐ {isEn ? 'Vice President / Wakil Ketua (Executive Board)' : 'Wakil Ketua / Vice President (Pengurus Inti)'}</option>
                  <option value="secretary">📝 {isEn ? 'Secretary / Sekretaris (Attendance & Roster Logs)' : 'Sekretaris / Secretary (Rekap Presensi & Data Roster)'}</option>
                  <option value="treasurer">💰 {isEn ? 'Treasurer / Bendahara (Club Dues & Financial Books)' : 'Bendahara / Treasurer (Kas Masuk/Keluar & Keuangan)'}</option>
                  <option value="pr">📣 {isEn ? 'Public Relations / Humas (Club Announcements)' : 'Humas / Public Relations (Pengumuman Resmi)'}</option>
                  {Boolean(session && (isHeadAdmin(session) || getCanonicalRole(session) === 'admin')) && (
                    <option value="advisor">🛡️ {isEn ? 'Faculty Advisor / Guru Pembina (Supervisory Oversight)' : 'Guru Pembina / Faculty Advisor (Pengawasan Ekskul)'}</option>
                  )}
                </select>
              )}
              <p className="text-[10px] text-indigo-800/80 leading-relaxed">
                {isEn 
                  ? 'Assigning an Executive Board title grants operational authority according to the RBAC matrix upon saving.'
                  : 'Menetapkan jabatan Pengurus Inti akan memberikan hak akses operasional sesuai matriks RBAC saat disimpan.'}
              </p>
            </div>

            {/* Row 3: NISN & Date of Birth & NIK */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
                  <Hash className="w-3.5 h-3.5 text-slate-400" />
                  <span>{isEn ? 'NISN (Student ID) *' : 'NISN (Nomor Induk Siswa) *'}</span>
                </label>
                <input
                  id="formNisn"
                  type="text"
                  required
                  placeholder={isEn ? "e.g. 0110000001" : "Contoh: 0110000001"}
                  value={formData.nisn}
                  onChange={(e) => setFormData({ ...formData, nisn: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-mono placeholder-slate-400 focus:outline-none focus:bg-white focus:border-blue-600 transition"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
                  <span className="text-emerald-600 font-bold">📅</span>
                  <span>{isEn ? 'Date of Birth (Verification)' : 'Tanggal Lahir (Verifikasi)'}</span>
                </label>
                <input
                  id="formBirthDate"
                  type="date"
                  value={formData.birthDate}
                  onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-mono focus:outline-none focus:bg-white focus:border-blue-600 transition"
                  title={isEn ? "Used to verify student account identity" : "Digunakan untuk memverifikasi akun siswa"}
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
                  <Hash className="w-3.5 h-3.5 text-slate-400" />
                  <span>{isEn ? 'Citizen ID (NIK)' : 'NIK (Nomor Induk Kependudukan)'}</span>
                </label>
                <input
                  id="formNik"
                  type="text"
                  placeholder={isEn ? "16-Digit NIK" : "16 Digit NIK"}
                  value={formData.nik}
                  onChange={(e) => setFormData({ ...formData, nik: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-mono placeholder-slate-400 focus:outline-none focus:bg-white focus:border-blue-600 transition"
                />
              </div>
            </div>

            {/* Row 4: Phone & Email */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  <span>{isEn ? 'Student WhatsApp Phone *' : 'Nomor WhatsApp Siswa *'}</span>
                </label>
                <input
                  id="formPersonalPhone"
                  type="tel"
                  required
                  placeholder="0812xxxxxxxx"
                  value={formData.personalPhone}
                  onChange={(e) => setFormData({ ...formData, personalPhone: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-mono placeholder-slate-400 focus:outline-none focus:bg-white focus:border-blue-600 transition"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  <span>{isEn ? 'Parent / Guardian Phone' : 'No. HP Orang Tua / Wali'}</span>
                </label>
                <input
                  id="formParentPhone"
                  type="tel"
                  placeholder="08xxxxxxxxxx"
                  value={formData.parentPhone}
                  onChange={(e) => setFormData({ ...formData, parentPhone: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-mono placeholder-slate-400 focus:outline-none focus:bg-white focus:border-blue-600 transition"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                  <span>{isEn ? 'Student Email Address' : 'Alamat Email Siswa'}</span>
                </label>
                <input
                  id="formEmail"
                  type="email"
                  placeholder="student@gmail.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-blue-600 transition"
                />
              </div>
            </div>

            {/* Row 5: Address */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                <span>{isEn ? 'Complete Residential Address' : 'Alamat Lengkap Tempat Tinggal'}</span>
              </label>
              <textarea
                id="formAddress"
                rows={2}
                placeholder={isEn ? "Street address, district, Bekasi, West Java..." : "Jalan, nomor rumah, RT/RW, kelurahan, kecamatan, Kota Bekasi..."}
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-blue-600 transition"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition cursor-pointer"
              >
                {isEn ? 'Cancel' : 'Batal'}
              </button>
              
              <button
                id="saveMemberSubmitBtn"
                type="submit"
                disabled={isSubmitting}
                className="flex items-center gap-2 px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition active:scale-95 cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5" />
                    <span>
                      {activeMember 
                        ? (isEn ? 'Save Changes' : 'Simpan Perubahan') 
                        : (isEn ? 'Enroll Member' : 'Daftarkan Siswa')}
                    </span>
                  </>
                )}
              </button>
            </div>

          </form>

        </motion.div>
      </div>
    </AnimatePresence>
  );
};
