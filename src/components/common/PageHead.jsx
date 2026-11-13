import { useEffect } from 'react';

export default function PageHead({ title, description }) {
  useEffect(() => {
    const fullTitle = title
      ? `${title} | DreamTech Kashmir Solutions`
      : 'DreamTech Kashmir Solutions — Website Design & Development';
    document.title = fullTitle;

    if (description) {
      let meta = document.querySelector('meta[name="description"]');
      if (!meta) {
        meta = document.createElement('meta');
        meta.setAttribute('name', 'description');
        document.head.appendChild(meta);
      }
      meta.setAttribute('content', description);
    }
  }, [title, description]);

  return null;
}
