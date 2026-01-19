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

  const normalizeUrl = (value: string) => {
    if (/^https?:\/\//i.test(value)) return value;
    if (/^www\./i.test(value)) return `https://${value}`;
    return value;
  };

  const isUrlInput = (value: string) => {
    return /^https?:\/\//i.test(value) || /^www\./i.test(value);
  };

  const makeCustomId = (type: 'url' | 'prompt', value: string) => {
    const slug = value.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40);
    return `custom:${type}:${slug || Date.now()}`;
  };

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

  const handleCustomSelect = () => {
    const trimmed = query.trim();
    if (!trimmed || selectedInterests.length >= maxSelections) return;

    const isUrl = isUrlInput(trimmed);
    const value = isUrl ? normalizeUrl(trimmed) : trimmed;
    if (selectedInterests.some(s => s.label === value)) {
      setQuery('');
      setIsOpen(false);
      return;
    }

    const customInterest: Interest = {
      id: makeCustomId(isUrl ? 'url' : 'prompt', value),
      label: value,
      category: 'Custom',
    };
    handleSelect(customInterest);
  };

  const handleRemove = (interestId: string) => {
    onSelectionChange(selectedInterests.filter(i => i.id !== interestId));
  };

  return (
    <div className="w-full">
      {/* Selected interests as pills */}
      {selectedInterests.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {selectedInterests.map(interest => (
            <span
              key={interest.id}
              className="inline-flex items-center gap-2 px-3 py-2 bg-[var(--accent)]/15 text-[var(--accent)] rounded-lg text-sm font-medium border border-[var(--accent)]/30"
            >
              {interest.label}
              <button
                type="button"
                onClick={() => handleRemove(interest.id)}
                disabled={disabled}
                className="text-[var(--accent)]/70 hover:text-[var(--accent)] disabled:opacity-50 transition"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Input with dropdown */}
      <div className="relative">
        <div className="relative">
          <svg
            className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-muted)]"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && query.trim().length > 0) {
                e.preventDefault();
                if (isUrlInput(query.trim())) {
                  handleCustomSelect();
                } else if (filteredInterests.length > 0) {
                  handleSelect(filteredInterests[0]);
                } else {
                  handleCustomSelect();
                }
              }
            }}
            onFocus={() => setIsOpen(true)}
            placeholder={
              selectedInterests.length >= maxSelections
                ? `Maximum ${maxSelections} topics selected`
                : 'Search topics or paste a URL...'
            }
            disabled={disabled || selectedInterests.length >= maxSelections}
            className="w-full pl-12 pr-4 py-4 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] disabled:opacity-50 disabled:cursor-not-allowed transition"
          />
        </div>

        {/* Dropdown */}
        {isOpen && !disabled && selectedInterests.length < maxSelections && (
          <div
            ref={dropdownRef}
            className="absolute z-20 w-full mt-2 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl shadow-2xl overflow-hidden"
          >
            {/* Category filters */}
            <div className="flex gap-2 p-3 border-b border-[var(--border)] overflow-x-auto scrollbar-none">
              <button
                onClick={() => setSelectedCategory(null)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap transition ${
                  !selectedCategory
                    ? 'bg-[var(--accent)] text-[var(--bg-primary)]'
                    : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'
                }`}
              >
                All
              </button>
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap transition ${
                    selectedCategory === cat
                      ? 'bg-[var(--accent)] text-[var(--bg-primary)]'
                      : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Interest list */}
            <div className="max-h-64 overflow-y-auto">
              {query.trim().length > 0 && (
                <button
                  onClick={handleCustomSelect}
                  className="w-full px-4 py-3 text-left hover:bg-[var(--bg-hover)] flex justify-between items-center border-b border-[var(--border)] transition"
                >
                  <span className="font-medium text-[var(--text-primary)]">
                    {isUrlInput(query.trim())
                      ? `Use URL: ${normalizeUrl(query.trim())}`
                      : `"${query.trim()}"`
                    }
                  </span>
                  <span className="text-xs px-2 py-1 rounded bg-[var(--bg-tertiary)] text-[var(--text-muted)]">
                    Custom
                  </span>
                </button>
              )}

              {filteredInterests.length === 0 ? (
                <div className="p-6 text-center text-[var(--text-muted)]">
                  No matching topics found
                </div>
              ) : (
                filteredInterests.map(interest => (
                  <button
                    key={interest.id}
                    onClick={() => handleSelect(interest)}
                    className="w-full px-4 py-3 text-left hover:bg-[var(--bg-hover)] flex justify-between items-center transition"
                  >
                    <span className="font-medium text-[var(--text-primary)]">{interest.label}</span>
                    <span className="text-xs text-[var(--text-muted)]">{interest.category}</span>
                  </button>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      <p className="mt-3 text-sm text-[var(--text-muted)]">
        {selectedInterests.length}/{maxSelections} topics selected
      </p>
    </div>
  );
}
