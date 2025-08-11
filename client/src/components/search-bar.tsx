import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface SearchBarProps {
  onSearch: (query: string) => void;
  placeholder?: string;
}

export default function SearchBar({ onSearch, placeholder = "Enter city or state (e.g., San Francisco, CA)" }: SearchBarProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      onSearch(searchQuery.trim());
    }
  };

  const popularSearches = ["San Francisco", "New York", "Portland", "Seattle"];

  return (
    <div className="bg-gray-50 rounded-2xl p-8">
      <form onSubmit={handleSubmit} className="flex flex-col md:flex-row gap-4">
        <div className="flex-1">
          <Input
            type="text"
            placeholder={placeholder}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-6 py-4 rounded-lg border border-gray-300 focus:border-warm-orange focus:ring-2 focus:ring-warm-orange focus:ring-opacity-20 outline-none text-lg"
          />
        </div>
        <Button 
          type="submit"
          className="bg-warm-orange text-white px-8 py-4 rounded-lg font-bold text-lg hover:bg-opacity-90 transition-colors"
        >
          <i className="fas fa-search mr-2"></i>
          Search
        </Button>
      </form>
      
      <div className="mt-6 flex flex-wrap gap-2">
        <span className="text-sm text-gray-600 mr-2">Popular searches:</span>
        {popularSearches.map((search) => (
          <button
            key={search}
            onClick={() => onSearch(search)}
            className="text-sm bg-white px-3 py-1 rounded-full border hover:border-warm-orange transition-colors"
          >
            {search}
          </button>
        ))}
      </div>
    </div>
  );
}
