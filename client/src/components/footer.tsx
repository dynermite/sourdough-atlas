export default function Footer() {
  return (
    <footer className="bg-gray-900 text-white py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <div className="flex items-center mb-4">
              <i className="fas fa-pizza-slice text-2xl text-warm-orange mr-3"></i>
              <h3 className="text-xl font-bold">SourDough Scout</h3>
            </div>
            <p className="text-gray-400">Discover authentic sourdough pizza restaurants across America for your next culinary adventure.</p>
          </div>

          <div>
            <h4 className="text-lg font-semibold mb-4">Features</h4>
            <ul className="space-y-2 text-gray-400">
              <li><a href="#" className="hover:text-white transition-colors">Interactive Map</a></li>
              <li><a href="#" className="hover:text-white transition-colors">City Search</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Restaurant Details</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Mobile Directions</a></li>
            </ul>
          </div>

          <div>
            <h4 className="text-lg font-semibold mb-4">Support</h4>
            <ul className="space-y-2 text-gray-400">
              <li><a href="#" className="hover:text-white transition-colors">Submit a Restaurant</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Report an Error</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Contact Us</a></li>
              <li><a href="#" className="hover:text-white transition-colors">FAQ</a></li>
            </ul>
          </div>

          <div>
            <h4 className="text-lg font-semibold mb-4">Connect</h4>
            <div className="flex space-x-4">
              <a href="#" className="text-gray-400 hover:text-white transition-colors text-xl">
                <i className="fab fa-twitter"></i>
              </a>
              <a href="#" className="text-gray-400 hover:text-white transition-colors text-xl">
                <i className="fab fa-instagram"></i>
              </a>
              <a href="#" className="text-gray-400 hover:text-white transition-colors text-xl">
                <i className="fab fa-facebook"></i>
              </a>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-8 pt-8 text-center">
          <p className="text-gray-400">&copy; 2025 SourDough Scout. All rights reserved. Built for sourdough pizza lovers.</p>
        </div>
      </div>
    </footer>
  );
}
