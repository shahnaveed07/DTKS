import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { useApp } from '../../context/AppContext.jsx';
import PageHead from '../../components/common/PageHead.jsx';
import StatusBadge from '../../components/common/StatusBadge.jsx';
import { computeDashboardStats, formatCurrency } from '../../utils/orderUtils.js';

export default function AdminDashboardPage() {
  const { orders, inquiries, portfolio, team } = useApp();
  const stats = computeDashboardStats({ orders, inquiries, portfolio, team });

  const kpis = [
    { label: 'Website Orders', value: stats.totalOrders, to: '/admin/orders' },
    { label: 'Active Website Builds', value: stats.activeProjects, to: '/admin/orders' },
    { label: 'Pending Quotations', value: stats.pendingQuotations, to: '/admin/orders' },
    { label: 'Completed Websites', value: stats.completedProjects, to: '/admin/orders' },
    { label: 'DreamTech Hosting', value: stats.managedHostingOrders, to: '/admin/orders' },
    { label: 'Maintenance Requests', value: stats.maintenanceInterestedOrders, to: '/admin/packages' },
    { label: 'Published Portfolio', value: stats.portfolioProjects, to: '/admin/portfolio' },
    { label: 'New Inquiries', value: stats.newInquiries, to: '/admin/inquiries' },
  ];

  const recentOrders = orders.slice(0, 5);
  const recentInquiries = inquiries.slice(0, 5);

  return (
    <>
      <PageHead title="Admin Dashboard (Demo)" />

      <div className="space-y-8">
        <div>
          <h1 className="font-display text-2xl font-bold text-[#17231C]">
            Website Operations Overview
          </h1>
          <p className="mt-1 text-sm text-[#64756B]">
            Manage incoming website development orders, quotations, project progress, hosting arrangements, maintenance plans, packages, portfolio, team, and inquiries.
          </p>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {kpis.map((kpi) => (
            <Link
              key={kpi.label}
              to={kpi.to}
              className="rounded-xl border border-[#E3EBE5] bg-white shadow-xs p-5 hover:border-[#16834A]/60 hover:shadow-sm transition-all"
            >
              <p className="text-xs font-medium text-[#64756B]">
                {kpi.label}
              </p>
              <p className="mt-2 font-display text-3xl font-bold text-[#116438] tabular-nums">
                {kpi.value}
              </p>
            </Link>
          ))}
        </div>

        {/* Recent Website Orders Table */}
        <div className="rounded-xl border border-[#E3EBE5] bg-white shadow-xs overflow-hidden">
          <div className="px-6 py-4 border-b border-[#E3EBE5] flex items-center justify-between">
            <h2 className="font-display text-base font-semibold text-[#17231C]">
              Recent Website Orders
            </h2>
            <Link
              to="/admin/orders"
              className="inline-flex items-center gap-1 text-xs font-semibold text-[#16834A] hover:text-[#116438] hover:underline"
            >
              <span>Manage All</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-[#E3EBE5] bg-[#E8F5EC]/50 text-xs text-[#116438]">
                  <th className="py-3 px-4 font-semibold">Reference</th>
                  <th className="py-3 px-4 font-semibold">Website &amp; Category</th>
                  <th className="py-3 px-4 font-semibold">Customer</th>
                  <th className="py-3 px-4 font-semibold">Hosting</th>
                  <th className="py-3 px-4 font-semibold">Quote</th>
                  <th className="py-3 px-4 font-semibold">Progress</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E3EBE5]">
                {recentOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-[#F7FAF7] transition-colors">
                    <td className="py-3 px-4 font-mono-tabular text-xs font-semibold text-[#16834A] whitespace-nowrap">
                      {order.referenceId}
                    </td>
                    <td className="py-3 px-4">
                      <p className="font-medium text-[#17231C]">{order.projectName}</p>
                      <p className="text-xs text-[#64756B]">{order.service}</p>
                    </td>
                    <td className="py-3 px-4 text-[#64756B]">
                      {order.customerName}
                    </td>
                    <td className="py-3 px-4 text-xs text-[#64756B] whitespace-nowrap">
                      {order.hostingPreference}
                    </td>
                    <td className="py-3 px-4 font-mono-tabular text-[#17231C] whitespace-nowrap">
                      {order.quotationAmount
                        ? formatCurrency(order.quotationAmount, order.quotationCurrency || 'INR')
                        : 'Pending'}
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge status={order.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Inquiries */}
        <div className="rounded-xl border border-[#E3EBE5] bg-white shadow-xs overflow-hidden">
          <div className="px-6 py-4 border-b border-[#E3EBE5] flex items-center justify-between">
            <h2 className="font-display text-base font-semibold text-[#17231C]">
              Recent Customer Inquiries
            </h2>
            <Link
              to="/admin/inquiries"
              className="inline-flex items-center gap-1 text-xs font-semibold text-[#16834A] hover:text-[#116438] hover:underline"
            >
              <span>Manage Inquiries</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <div className="divide-y divide-[#E3EBE5]">
            {recentInquiries.length > 0 ? (
              recentInquiries.map((inq) => (
                <div key={inq.id} className="px-6 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium text-[#17231C]">
                      {inq.subject}
                    </p>
                    <p className="text-xs text-[#64756B]">
                      {inq.name} · {inq.email}
                    </p>
                  </div>
                  <StatusBadge status={inq.status} />
                </div>
              ))
            ) : (
              <p className="px-6 py-6 text-sm text-[#64756B]">
                No inquiries recorded yet.
              </p>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
