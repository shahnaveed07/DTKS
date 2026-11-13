import { useState } from 'react';
import {
  Plus,
  Edit3,
  Trash2,
  X,
  ArrowUp,
  ArrowDown,
  Eye,
  EyeOff,
  Upload,
  User,
} from 'lucide-react';
import { useApp } from '../../context/AppContext.jsx';
import { TEAM_ROLES } from '../../data/seedData.js';
import PageHead from '../../components/common/PageHead.jsx';

const EMPTY_MEMBER = {
  fullName: '',
  role: 'Full-Stack Web Developer',
  title: '',
  bio: '',
  skillsText: '',
  techText: '',
  avatarUrl: '',
  initials: '',
  linkedinUrl: '',
  githubUrl: '',
  websiteUrl: '',
  visible: true,
  isPlaceholder: false,
};

export default function AdminTeamPage() {
  const {
    team,
    createTeamMember,
    updateTeamMember,
    deleteTeamMember,
    reorderTeamMember,
    requestConfirm,
  } = useApp();

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_MEMBER);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_MEMBER);
    setModalOpen(true);
  };

  const openEdit = (member) => {
    setEditing(member);
    setForm({
      ...member,
      skillsText: (member.skills || []).join(', '),
      techText: (member.technologies || []).join(', '),
    });
    setModalOpen(true);
  };

  const handlePhotoUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setForm((f) => ({ ...f, avatarUrl: reader.result }));
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSave = (e) => {
    e.preventDefault();
    const trimmedName = form.fullName.trim();
    const computedInitials =
      form.initials.trim() ||
      trimmedName
        .split(/\s+/)
        .slice(0, 2)
        .map((w) => w[0]?.toUpperCase() || '')
        .join('');

    const payload = {
      fullName: trimmedName,
      role: form.role,
      title: form.title.trim(),
      bio: form.bio.trim(),
      skills: form.skillsText
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      technologies: form.techText
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      avatarUrl: form.avatarUrl.trim(),
      initials: computedInitials,
      linkedinUrl: form.linkedinUrl.trim(),
      githubUrl: form.githubUrl.trim(),
      websiteUrl: form.websiteUrl.trim(),
      visible: Boolean(form.visible),
      isPlaceholder: Boolean(form.isPlaceholder),
    };

    if (editing) {
      updateTeamMember(editing.id, payload);
    } else {
      createTeamMember(payload);
    }
    setModalOpen(false);
  };

  const handleDelete = (member) => {
    requestConfirm({
      title: `Remove "${member.fullName}"?`,
      message: 'This deletes the team profile from local storage.',
      confirmLabel: 'Remove Member',
      variant: 'danger',
      onConfirm: () => deleteTeamMember(member.id),
    });
  };

  return (
    <>
      <PageHead title="Manage Team | Admin" />

      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-bold text-[#17231C]">
              Team Management
            </h1>
            <p className="mt-1 text-sm text-[#64756B]">
              Replace role placeholders with verified team member profiles, photos, skills, and display order.
            </p>
          </div>
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg bg-[#16834A] hover:bg-[#116438] text-white whitespace-nowrap shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Add Team Member</span>
          </button>
        </div>

        <div className="space-y-4">
          {team.map((member, index) => (
            <div
              key={member.id}
              className="rounded-xl border border-[#E3EBE5] bg-white shadow-xs p-5 flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              <div className="flex items-start gap-4">
                {member.avatarUrl ? (
                  <img
                    src={member.avatarUrl}
                    alt={member.fullName}
                    referrerPolicy="no-referrer"
                    className="w-14 h-14 rounded-xl object-cover border border-[#E3EBE5] shrink-0"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-xl bg-[#E8F5EC] border border-[#E3EBE5] flex items-center justify-center shrink-0 text-[#16834A]">
                    {member.initials ? (
                      <span className="font-display font-bold">{member.initials}</span>
                    ) : (
                      <User className="w-5 h-5" />
                    )}
                  </div>
                )}

                <div>
                  <p className="text-xs font-semibold text-[#16834A]">
                    {member.role} · {member.visible ? 'Visible' : 'Hidden'}
                  </p>
                  <h2 className="font-display text-base font-bold text-[#17231C]">
                    {member.fullName}
                  </h2>
                  <p className="mt-1 text-xs text-[#64756B] max-w-2xl">
                    {member.bio}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <button
                  type="button"
                  disabled={index === 0}
                  onClick={() => reorderTeamMember(member.id, 'up')}
                  aria-label={`Move ${member.fullName} up`}
                  className="p-1.5 rounded-md border border-[#E3EBE5] text-[#64756B] hover:text-[#17231C] disabled:opacity-40"
                >
                  <ArrowUp className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  disabled={index === team.length - 1}
                  onClick={() => reorderTeamMember(member.id, 'down')}
                  aria-label={`Move ${member.fullName} down`}
                  className="p-1.5 rounded-md border border-[#E3EBE5] text-[#64756B] hover:text-[#17231C] disabled:opacity-40"
                >
                  <ArrowDown className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => updateTeamMember(member.id, { visible: !member.visible })}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-md border border-[#E3EBE5] text-[#17231C] hover:bg-[#F7FAF7]"
                >
                  {member.visible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  <span>{member.visible ? 'Hide' : 'Show'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => openEdit(member)}
                  aria-label={`Edit ${member.fullName}`}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-md border border-[#E3EBE5] text-[#17231C] hover:border-[#16834A] hover:text-[#16834A]"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Edit</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(member)}
                  aria-label={`Delete ${member.fullName}`}
                  className="p-1.5 rounded-md border border-[#E3EBE5] text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Team Modal */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#17231C]/40 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
          aria-labelledby="team-modal-title"
        >
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl border border-[#E3EBE5] bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between pb-4 border-b border-[#E3EBE5]">
              <h2 id="team-modal-title" className="font-display text-lg font-bold text-[#17231C]">
                {editing ? 'Edit Team Profile' : 'Add Team Member'}
              </h2>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                aria-label="Close team modal"
                className="p-1 text-[#64756B] hover:text-[#17231C]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="mt-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="tm-name" className="block text-xs font-semibold text-[#17231C] mb-1">
                    Full Name *
                  </label>
                  <input
                    id="tm-name"
                    type="text"
                    required
                    value={form.fullName}
                    onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-[#E3EBE5] bg-white text-[#17231C] focus:outline-none focus:border-[#16834A]"
                  />
                </div>
                <div>
                  <label htmlFor="tm-role" className="block text-xs font-semibold text-[#17231C] mb-1">
                    Role
                  </label>
                  <select
                    id="tm-role"
                    value={form.role}
                    onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-[#E3EBE5] bg-white text-[#17231C] focus:outline-none focus:border-[#16834A]"
                  >
                    {TEAM_ROLES.map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label htmlFor="tm-title" className="block text-xs font-semibold text-[#17231C] mb-1">
                  Specialty Title
                </label>
                <input
                  id="tm-title"
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  placeholder="e.g., Web Applications & API Architecture"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-[#E3EBE5] bg-white text-[#17231C] focus:outline-none focus:border-[#16834A]"
                />
              </div>

              <div>
                <label htmlFor="tm-bio" className="block text-xs font-semibold text-[#17231C] mb-1">
                  Short Biography
                </label>
                <textarea
                  id="tm-bio"
                  rows={3}
                  value={form.bio}
                  onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-[#E3EBE5] bg-white text-[#17231C] focus:outline-none focus:border-[#16834A]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="tm-skills" className="block text-xs font-semibold text-[#17231C] mb-1">
                    Skills (Comma separated)
                  </label>
                  <input
                    id="tm-skills"
                    type="text"
                    value={form.skillsText}
                    onChange={(e) => setForm((f) => ({ ...f, skillsText: e.target.value }))}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-[#E3EBE5] bg-white text-[#17231C] focus:outline-none focus:border-[#16834A]"
                  />
                </div>
                <div>
                  <label htmlFor="tm-tech" className="block text-xs font-semibold text-[#17231C] mb-1">
                    Technologies (Comma separated)
                  </label>
                  <input
                    id="tm-tech"
                    type="text"
                    value={form.techText}
                    onChange={(e) => setForm((f) => ({ ...f, techText: e.target.value }))}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-[#E3EBE5] bg-white text-[#17231C] focus:outline-none focus:border-[#16834A]"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="tm-avatar" className="block text-xs font-semibold text-[#17231C] mb-1">
                  Profile Photo (Upload or URL)
                </label>
                <div className="flex items-center gap-3">
                  <label className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-[#E3EBE5] text-[#17231C] cursor-pointer hover:bg-[#F7FAF7] shrink-0">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload Photo</span>
                    <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
                  </label>
                  <input
                    id="tm-avatar"
                    type="text"
                    value={form.avatarUrl}
                    onChange={(e) => setForm((f) => ({ ...f, avatarUrl: e.target.value }))}
                    placeholder="Optional photo URL or leave blank for initials"
                    className="flex-1 px-3 py-2 text-sm rounded-lg border border-[#E3EBE5] bg-white text-[#17231C] focus:outline-none focus:border-[#16834A]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label htmlFor="tm-linkedin" className="block text-xs font-semibold text-[#17231C] mb-1">
                    LinkedIn URL
                  </label>
                  <input
                    id="tm-linkedin"
                    type="url"
                    value={form.linkedinUrl}
                    onChange={(e) => setForm((f) => ({ ...f, linkedinUrl: e.target.value }))}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-[#E3EBE5] bg-white text-[#17231C] focus:outline-none focus:border-[#16834A]"
                  />
                </div>
                <div>
                  <label htmlFor="tm-github" className="block text-xs font-semibold text-[#17231C] mb-1">
                    GitHub URL
                  </label>
                  <input
                    id="tm-github"
                    type="url"
                    value={form.githubUrl}
                    onChange={(e) => setForm((f) => ({ ...f, githubUrl: e.target.value }))}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-[#E3EBE5] bg-white text-[#17231C] focus:outline-none focus:border-[#16834A]"
                  />
                </div>
                <div>
                  <label htmlFor="tm-web" className="block text-xs font-semibold text-[#17231C] mb-1">
                    Website URL
                  </label>
                  <input
                    id="tm-web"
                    type="url"
                    value={form.websiteUrl}
                    onChange={(e) => setForm((f) => ({ ...f, websiteUrl: e.target.value }))}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-[#E3EBE5] bg-white text-[#17231C] focus:outline-none focus:border-[#16834A]"
                  />
                </div>
              </div>

              <div className="flex items-center gap-6 text-sm">
                <label className="inline-flex items-center gap-2 text-[#17231C]">
                  <input
                    type="checkbox"
                    checked={form.visible}
                    onChange={(e) => setForm((f) => ({ ...f, visible: e.target.checked }))}
                    className="accent-[#16834A]"
                  />
                  <span>Visible on Team Page</span>
                </label>
                <label className="inline-flex items-center gap-2 text-[#17231C]">
                  <input
                    type="checkbox"
                    checked={form.isPlaceholder}
                    onChange={(e) => setForm((f) => ({ ...f, isPlaceholder: e.target.checked }))}
                    className="accent-[#16834A]"
                  />
                  <span>Mark as Placeholder Profile</span>
                </label>
              </div>

              <div className="pt-3 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium rounded-lg border border-[#E3EBE5] text-[#17231C] hover:bg-[#F7FAF7]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-sm font-semibold rounded-lg bg-[#16834A] hover:bg-[#116438] text-white"
                >
                  {editing ? 'Save Changes' : 'Add Member'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
