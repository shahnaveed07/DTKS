import { Link } from 'react-router-dom';
import {
  Globe,
  LayoutGrid,
  Smartphone,
  Terminal,
  Compass,
  Gamepad2,
  ShoppingBag,
  ShieldCheck,
  ArrowRight,
} from 'lucide-react';

const ICON_MAP = {
  Globe,
  LayoutGrid,
  Smartphone,
  Terminal,
  Compass,
  Gamepad2,
  ShoppingBag,
  ShieldCheck,
};

export default function ServiceCard({ service, index }) {
  const Icon = ICON_MAP[service.iconName] || Globe;

  return (
    <article className="group flex flex-col justify-between rounded-xl border border-[#E3EBE5] bg-white p-6 shadow-xs transition-all duration-200 hover:border-[#16834A]/60 hover:shadow-sm">
      <div>
        <div className="flex items-center justify-between gap-4 mb-4">
          <div className="w-10 h-10 rounded-lg bg-[#E8F5EC] text-[#16834A] flex items-center justify-center">
            <Icon className="w-5 h-5" />
          </div>
          {typeof index === 'number' && (
            <span className="font-mono-tabular text-xs text-[#64756B]">
              {String(index + 1).padStart(2, '0')}
            </span>
          )}
        </div>

        <h3 className="font-display text-lg font-semibold text-[#17231C]">
          {service.title}
        </h3>
        <p className="mt-2 text-sm text-[#64756B] leading-relaxed">
          {service.shortDescription}
        </p>
      </div>

      <div className="mt-6 pt-4 border-t border-[#E3EBE5] flex items-center justify-between gap-4">
        <Link
          to={`/services#${service.slug}`}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-[#16834A] hover:text-[#116438] hover:underline whitespace-nowrap"
        >
          <span>Learn More</span>
          <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
        </Link>
        <Link
          to={`/request-quote?service=${encodeURIComponent(service.orderCategory)}`}
          className="text-xs font-medium text-[#64756B] hover:text-[#16834A] whitespace-nowrap"
        >
          Request Quote
        </Link>
      </div>
    </article>
  );
}
