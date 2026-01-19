'use client';

import { useState, useEffect, useRef } from 'react';
import { Interest } from '@/lib/types';

interface InterestPickerProps {
  selectedInterests: Interest[];
  onSelectionChange: (interests: Interest[]) => void;
  maxSelections?: number;
  disabled?: boolean;
}

export default function InterestPicker({
  selectedInterests,
  onSelectionChange,
  maxSelections = 5,
  disabled = false,
}: InterestPickerProps) {
  const [query, setQuery] = useState('');
  const [allInterests, setAllInterests] = useState<Interest[]>([]);
  const [filteredInterests, setFilteredInterests] = useState<Interest[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fetch all interests on mount
  useEffect(() => {
    fetch('/api/interests')
      .then(res => res.json())
      .then(data => {
        setAllInterests(data.interests);
        setCategories(data.categories);
      })
      .catch(err => console.error('Failed to load interests:', err));
  }, []);

  // Filter interests based on query and category
  useEffect(() => {
    let filtered = allInterests;

    if (selectedCategory) {
      filtered = filtered.filter(i => i.category === selectedCategory);
    }

    if (query) {
      const lowerQuery = query.toLowerCase();
      filtered = filtered.filter(
        i => i.label.toLowerCase().includes(lowerQuery)
      );
    }

    // Exclude already selected interests
    filtered = filtered.filter(
      i => !selectedInterests.some(s => s.id === i.id)
    );

    setFilteredInterests(filtered);
  }, [query, allInterests, selectedInterests, selectedCategory]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (interest: Interest) => {
    if (selectedInterests.length < maxSelections) {
      onSelectionChange([...selectedInterests, interest]);
      setQuery('');
      setIsOpen(false);
    }
  };

  const handleRemove = (interestId: string) => {
    onSelectionChange(selectedInterests.filter(i => i.id !== interestId));
  };

  return (
    <div className="w-full">
      {/* Selected interests as pills */}
      <div className="flex flex-wrap gap-2 mb-3">
        {selectedInterests.map(interest => (
          <span
            key={interest.id}
            className="inline-flex items-center gap-1 px-3 py-1.5 bg-indigo-100 text-indigo-800 rounded-full text-sm font-medium"
          >
            {interest.label}
            <button
              type="button"
              onClick={() => handleRemove(interest.id)}
              disabled={disabled}
              className="ml-1 text-indigo-600 hover:text-indigo-800 disabled:opacity-50"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </span>
        ))}
      </div>

      {/* Input with dropdown */}
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && query.trim().length > 0 && filteredInterests.length > 0) {
              e.preventDefault();
              handleSelect(filteredInterests[0]);
            }
          }}
          onFocus={() => setIsOpen(true)}
          placeholder={
            selectedInterests.length >= maxSelections
              ? `Maximum ${maxSelections} interests selected`
              : 'Search for topics...'
          }
          disabled={disabled || selectedInterests.length >= maxSelections}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
        />

        {/* Dropdown */}
        {isOpen && !disabled && selectedInterests.length < maxSelections && (
          <div
            ref={dropdownRef}
            className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-80 overflow-hidden"
          >
            {/* Category filters */}
            <div className="flex gap-1 p-2 border-b overflow-x-auto">
              <button
                onClick={() => setSelectedCategory(null)}
                className={`px-2 py-1 text-xs rounded-full whitespace-nowrap ${
                  !selectedCategory
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                All
              </button>
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-2 py-1 text-xs rounded-full whitespace-nowrap ${
                    selectedCategory === cat
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Interest list */}
            <div className="max-h-60 overflow-y-auto">
              {filteredInterests.length === 0 ? (
                <div className="p-4 text-center text-gray-500">
                  No matching topics found
                </div>
              ) : (
                filteredInterests.map(interest => (
                  <button
                    key={interest.id}
                    onClick={() => handleSelect(interest)}
                    className="w-full px-4 py-2.5 text-left hover:bg-indigo-50 flex justify-between items-center"
                  >
                    <span className="font-medium">{interest.label}</span>
                    <span className="text-xs text-gray-500">{interest.category}</span>
                  </button>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      <p className="mt-2 text-sm text-gray-500">
        {selectedInterests.length}/{maxSelections} topics selected
      </p>
    </div>
  );
}
