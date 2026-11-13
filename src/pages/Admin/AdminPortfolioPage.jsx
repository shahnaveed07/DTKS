import { useState } from 'react';
import { Plus, Edit3, Trash2, X, Eye, EyeOff, Star, Upload } from 'lucide-react';
import { useApp } from '../../context/AppContext.jsx';
import { PORTFOLIO_CATEGORIES } from '../../data/seedData.js';
import PageHead from '../../components/common/PageHead.jsx';
import ImageWithFallback from '../../components/common/ImageWithFallback.jsx';

const EMPTY_PROJECT = {
  title: '',
  category: 'Business Websites',
  shortOverview: '',
  description: '',
  problemAddressed: '',
  solutionImplemented: '',
  featuresText: '',
  techText: '',
  status: 'Completed',
  isSample: false,
  published: true,
  featured: false,
  completionDate: '',
  coverImage: '/src/assets/images/portfolio_webapp_showcase_1794577652813.jpg',
  galleryText: '',
  liveUrl: '',
  githubUrl: '',
  demoVideoUrl: '',
};

const BUNDLED_IMAGES = [
  { label: 'Corporate Website', path: '/src/assets/images/portfolio_webapp_showcase_1794577652813.jpg' },
  { label: 'E-Commerce Storefront', path: '/src/assets/images/portfolio_ecommerce_showcase_1794577653883.jpg' },
  { label: 'Emerald Web Studio', path: '/src/assets/images/hero_emerald_studio_1794579090899.jpg' },
  { label: 'Editorial Web Studio', path: '/src/assets/images/hero_software_studio_1794577652777.jpg' },
];

export default function AdminPortfolioPage() {
  const { portfolio, createProject, updateProject, deleteProject, requestConfirm } = useApp();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_PROJECT);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_PROJECT);
    setModalOpen(true);
  };

  const openEdit = (proj) => {
    setEditing(proj);
    setForm({
      ...proj,
      featuresText: (proj.keyFeatures || []).join('\n'),
      techText: (proj.technologies || []).join(', '),
      galleryText: (proj.gallery || []).join('\n'),
    });
    setModalOpen(true);
  };

  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setForm((f) => ({ ...f, coverImage: reader.result }));
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSave = (e) => {
    e.preventDefault();
    const galleryLines = form.galleryText
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);

    const payload = {
      title: form.title.trim(),
      category: form.category,
      shortOverview: form.shortOverview.trim(),
      description: form.description.trim() || form.shortOverview.trim(),
      problemAddressed: form.problemAddressed.trim(),
      solutionImplemented: form.solutionImplemented.trim(),
      keyFeatures: form.featuresText
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean),
      technologies: form.techText
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      status: form.status.trim() || 'Completed',
      isSample: Boolean(form.isSample),
      published: Boolean(form.published),
      featured: Boolean(form.featured),
      completionDate: form.completionDate.trim(),
      coverImage: form.coverImage.trim(),
      gallery: galleryLines.length > 0 ? galleryLines : [form.coverImage.trim()].filter(Boolean),
      liveUrl: form.liveUrl.trim(),
      githubUrl: form.githubUrl.trim(),
      demoVideoUrl: form.demoVideoUrl.trim(),
    };

    if (editing) {
      updateProject(editing.id, payload);
    } else {
      createProject(payload);
    }
    setModalOpen(false);
  };

  const handleDelete = (proj) => {
    requestConfirm({
      title: `Delete "${proj.title}"?`,
      message: 'This removes the portfolio record from local browser storage.',
      confirmLabel: 'Delete Project',
      variant: 'danger',
      onConfirm: () => deleteProject(proj.id),
    });
  };

  return (
    <>
      <PageHead title="Manage Portfolio | Admin" />

      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-bold text-[#17231C]">
              Portfolio Projects
            </h1>
            <p className="mt-1 text-sm text-[#64756B]">
              Add completed work, upload screenshots, manage galleries, and toggle public or featured visibility.
            </p>
          </div>
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg bg-[#16834A] hover:bg-[#116438] text-white whitespace-nowrap shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Add Project</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {portfolio.map((proj) => (
            <div
              key={proj.id}
              className="rounded-xl border border-[#E3EBE5] bg-white shadow-xs overflow-hidden flex flex-col justify-between"
            >
              <div>
                <div className="aspect-16/9 bg-[#F7FAF7] border-b border-[#E3EBE5]">
                  <ImageWithFallback
                    src={proj.coverImage}
                    alt={proj.title}
                    fallbackTitle={proj.title}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="p-5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-[#16834A]">{proj.category}</span>
                    <span className="text-[#64756B]">
                      {proj.published ? 'Published' : 'Draft'} · {proj.status}
                    </span>
                  </div>
                  <h2 className="mt-1.5 font-display text-lg font-bold text-[#17231C]">
                    {proj.title}
                  </h2>
                  <p className="mt-1.5 text-sm text-[#64756B] line-clamp-2">
                    {proj.shortOverview}
                  </p>
                </div>
              </div>

              <div className="px-5 py-3.5 border-t border-[#E3EBE5] flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => updateProject(proj.id, { published: !proj.published })}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md border border-[#E3EBE5] text-[#17231C] hover:bg-[#F7FAF7]"
                  >
                    {proj.published ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    <span>{proj.published ? 'Unpublish' : 'Publish'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => updateProject(proj.id, { featured: !proj.featured })}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md border ${
                      proj.featured
                        ? 'border-[#16834A] bg-[#E8F5EC] text-[#116438]'
                        : 'border-[#E3EBE5] text-[#64756B]'
                    }`}
                  >
                    <Star className="w-3 h-3" />
                    <span>{proj.featured ? 'Featured' : 'Feature'}</span>
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => openEdit(proj)}
                    aria-label={`Edit ${proj.title}`}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md border border-[#E3EBE5] text-[#17231C] hover:border-[#16834A] hover:text-[#16834A]"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Edit</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(proj)}
                    aria-label={`Delete ${proj.title}`}
                    className="p-1.5 rounded-md border border-[#E3EBE5] text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Add/Edit Project Modal */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#17231C]/40 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
          aria-labelledby="proj-modal-title"
        >
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl border border-[#E3EBE5] bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between pb-4 border-b border-[#E3EBE5]">
              <h2 id="proj-modal-title" className="font-display text-lg font-bold text-[#17231C]">
                {editing ? `Edit ${editing.title}` : 'Add Portfolio Project'}
              </h2>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                aria-label="Close project modal"
                className="p-1 text-[#64756B] hover:text-[#17231C]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="mt-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="proj-title" className="block text-xs font-semibold text-[#17231C] mb-1">
                    Project Title *
                  </label>
                  <input
                    id="proj-title"
                    type="text"
                    required
                    value={form.title}
                    onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-[#E3EBE5] bg-white text-[#17231C] focus:outline-none focus:border-[#16834A]"
                  />
                </div>
                <div>
                  <label htmlFor="proj-category" className="block text-xs font-semibold text-[#17231C] mb-1">
                    Category
                  </label>
                  <select
                    id="proj-category"
                    value={form.category}
                    onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-[#E3EBE5] bg-white text-[#17231C] focus:outline-none focus:border-[#16834A]"
                  >
                    {PORTFOLIO_CATEGORIES.filter((c) => c !== 'All').map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label htmlFor="proj-overview" className="block text-xs font-semibold text-[#17231C] mb-1">
                  Short Overview *
                </label>
                <textarea
                  id="proj-overview"
                  rows={2}
                  required
                  value={form.shortOverview}
                  onChange={(e) => setForm((f) => ({ ...f, shortOverview: e.target.value }))}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-[#E3EBE5] bg-white text-[#17231C] focus:outline-none focus:border-[#16834A]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="proj-problem" className="block text-xs font-semibold text-[#17231C] mb-1">
                    Problem Addressed
                  </label>
                  <textarea
                    id="proj-problem"
                    rows={2}
                    value={form.problemAddressed}
                    onChange={(e) => setForm((f) => ({ ...f, problemAddressed: e.target.value }))}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-[#E3EBE5] bg-white text-[#17231C] focus:outline-none focus:border-[#16834A]"
                  />
                </div>
                <div>
                  <label htmlFor="proj-solution" className="block text-xs font-semibold text-[#17231C] mb-1">
                    Solution Implemented
                  </label>
                  <textarea
                    id="proj-solution"
                    rows={2}
                    value={form.solutionImplemented}
                    onChange={(e) => setForm((f) => ({ ...f, solutionImplemented: e.target.value }))}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-[#E3EBE5] bg-white text-[#17231C] focus:outline-none focus:border-[#16834A]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="proj-tech" className="block text-xs font-semibold text-[#17231C] mb-1">
                    Technologies (Comma separated)
                  </label>
                  <input
                    id="proj-tech"
                    type="text"
                    value={form.techText}
                    onChange={(e) => setForm((f) => ({ ...f, techText: e.target.value }))}
                    placeholder="React, Node.js, Tailwind CSS"
                    className="w-full px-3 py-2 text-sm rounded-lg border border-[#E3EBE5] bg-white text-[#17231C] focus:outline-none focus:border-[#16834A]"
                  />
                </div>
                <div>
                  <label htmlFor="proj-date" className="block text-xs font-semibold text-[#17231C] mb-1">
                    Completion Date (Optional)
                  </label>
                  <input
                    id="proj-date"
                    type="text"
                    value={form.completionDate}
                    onChange={(e) => setForm((f) => ({ ...f, completionDate: e.target.value }))}
                    placeholder="e.g., October 2026"
                    className="w-full px-3 py-2 text-sm rounded-lg border border-[#E3EBE5] bg-white text-[#17231C] focus:outline-none focus:border-[#16834A]"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="proj-cover" className="block text-xs font-semibold text-[#17231C] mb-1">
                  Cover Image (Select preset, paste URL, or upload)
                </label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {BUNDLED_IMAGES.map((img) => (
                    <button
                      key={img.path}
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, coverImage: img.path }))}
                      className={`px-2.5 py-1 text-xs rounded border ${
                        form.coverImage === img.path
                          ? 'border-[#16834A] bg-[#E8F5EC] text-[#116438] font-medium'
                          : 'border-[#E3EBE5] text-[#64756B]'
                      }`}
                    >
                      {img.label}
                    </button>
                  ))}
                  <label className="inline-flex items-center gap-1 px-2.5 py-1 text-xs rounded border border-[#E3EBE5] text-[#17231C] cursor-pointer hover:bg-[#F7FAF7]">
                    <Upload className="w-3 h-3" />
                    <span>Upload Image</span>
                    <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                  </label>
                </div>
                <input
                  id="proj-cover"
                  type="text"
                  value={form.coverImage}
                  onChange={(e) => setForm((f) => ({ ...f, coverImage: e.target.value }))}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-[#E3EBE5] bg-white text-[#17231C] focus:outline-none focus:border-[#16834A]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label htmlFor="proj-live" className="block text-xs font-semibold text-[#17231C] mb-1">
                    Live URL
                  </label>
                  <input
                    id="proj-live"
                    type="url"
                    value={form.liveUrl}
                    onChange={(e) => setForm((f) => ({ ...f, liveUrl: e.target.value }))}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-[#E3EBE5] bg-white text-[#17231C] focus:outline-none focus:border-[#16834A]"
                  />
                </div>
                <div>
                  <label htmlFor="proj-github" className="block text-xs font-semibold text-[#17231C] mb-1">
                    GitHub URL
                  </label>
                  <input
                    id="proj-github"
                    type="url"
                    value={form.githubUrl}
                    onChange={(e) => setForm((f) => ({ ...f, githubUrl: e.target.value }))}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-[#E3EBE5] bg-white text-[#17231C] focus:outline-none focus:border-[#16834A]"
                  />
                </div>
                <div>
                  <label htmlFor="proj-status" className="block text-xs font-semibold text-[#17231C] mb-1">
                    Status Label
                  </label>
                  <input
                    id="proj-status"
                    type="text"
                    value={form.status}
                    onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-[#E3EBE5] bg-white text-[#17231C] focus:outline-none focus:border-[#16834A]"
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-6 text-sm">
                <label className="inline-flex items-center gap-2 text-[#17231C]">
                  <input
                    type="checkbox"
                    checked={form.published}
                    onChange={(e) => setForm((f) => ({ ...f, published: e.target.checked }))}
                    className="accent-[#16834A]"
                  />
                  <span>Published</span>
                </label>
                <label className="inline-flex items-center gap-2 text-[#17231C]">
                  <input
                    type="checkbox"
                    checked={form.featured}
                    onChange={(e) => setForm((f) => ({ ...f, featured: e.target.checked }))}
                    className="accent-[#16834A]"
                  />
                  <span>Featured on Home</span>
                </label>
                <label className="inline-flex items-center gap-2 text-[#17231C]">
                  <input
                    type="checkbox"
                    checked={form.isSample}
                    onChange={(e) => setForm((f) => ({ ...f, isSample: e.target.checked }))}
                    className="accent-[#16834A]"
                  />
                  <span>Mark as Sample Showcase</span>
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
                  {editing ? 'Save Project' : 'Add Project'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
