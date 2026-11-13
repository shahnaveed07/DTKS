import Navbar from './Navbar.jsx';
import Footer from './Footer.jsx';

export default function PublicLayout({ children }) {
  return (
    <div className="min-h-screen flex flex-col bg-[#FFFFFF] text-[#17231C] overflow-x-hidden">
      <Navbar />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
