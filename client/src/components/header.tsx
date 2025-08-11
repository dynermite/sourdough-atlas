import { useState } from "react";
import { Link, useLocation } from "wouter";

export default function Header() {
  const [location] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="bg-white shadow-sm sticky top-0 z-50">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link href="/" className="flex items-center">
            <i className="fas fa-pizza-slice text-2xl text-warm-orange mr-3"></i>
            <h1 className="text-xl font-bold text-gray-900">SourDough Scout</h1>
          </Link>
          
          <div className="hidden md:flex space-x-8">
            <a href="#map" className="text-gray-700 hover:text-warm-orange transition-colors">Map</a>
            <a href="#search" className="text-gray-700 hover:text-warm-orange transition-colors">Search</a>
            <a href="#about" className="text-gray-700 hover:text-warm-orange transition-colors">About</a>
          </div>
          
          <div className="md:hidden">
            <button 
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="text-gray-700"
            >
              <i className="fas fa-bars"></i>
            </button>
          </div>
        </div>
        
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t">
            <div className="flex flex-col space-y-4">
              <a href="#map" className="text-gray-700 hover:text-warm-orange transition-colors">Map</a>
              <a href="#search" className="text-gray-700 hover:text-warm-orange transition-colors">Search</a>
              <a href="#about" className="text-gray-700 hover:text-warm-orange transition-colors">About</a>
            </div>
          </div>
        )}
      </nav>
    </header>
  );
}
