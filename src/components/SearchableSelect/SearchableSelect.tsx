'use client';

import { useState, useEffect, useRef } from 'react';
import styles from './SearchableSelect.module.css';

interface SearchableSelectProps {
    options: string[];
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    disabled?: boolean;
    required?: boolean;
    id?: string;
    label?: string;
    dropdownPosition?: 'absolute' | 'fixed';
}

export default function SearchableSelect({
    options,
    value,
    onChange,
    placeholder = 'Type to search...',
    disabled = false,
    required = false,
    id,
    label,
    dropdownPosition = 'absolute'
}: SearchableSelectProps) {
    const [inputValue, setInputValue] = useState(value);
    const [filteredOptions, setFilteredOptions] = useState<string[]>(options);
    const [showDropdown, setShowDropdown] = useState(false);
    const [highlightedIndex, setHighlightedIndex] = useState(-1);
    const [fixedStyles, setFixedStyles] = useState<React.CSSProperties>({});
    const wrapperRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Debounce timer ref
    const debounceTimer = useRef<NodeJS.Timeout | null>(null);

    // Update input value when prop value changes
    useEffect(() => {
        setInputValue(value);
    }, [value]);

    // Update filtered options when options change
    useEffect(() => {
        setFilteredOptions(options);
    }, [options]);

    // Filter options with debouncing (300ms)
    useEffect(() => {
        if (debounceTimer.current) {
            clearTimeout(debounceTimer.current);
        }

        debounceTimer.current = setTimeout(() => {
            if (inputValue.trim() === '') {
                setFilteredOptions(options);
            } else {
                const filtered = options.filter(option =>
                    option.toLowerCase().includes(inputValue.toLowerCase())
                );
                setFilteredOptions(filtered);
            }
        }, 300);

        return () => {
            if (debounceTimer.current) {
                clearTimeout(debounceTimer.current);
            }
        };
    }, [inputValue, options]);

    // Calculate fixed position when dropdown opens
    useEffect(() => {
        if (showDropdown && dropdownPosition === 'fixed' && inputRef.current) {
            const updatePosition = () => {
                if (inputRef.current) {
                    const rect = inputRef.current.getBoundingClientRect();
                    setFixedStyles({
                        position: 'fixed',
                        top: `${rect.bottom + 4}px`,
                        left: `${rect.left}px`,
                        width: `${rect.width}px`,
                        zIndex: 9999,
                        maxHeight: '300px'
                    });
                }
            };

            updatePosition();
            window.addEventListener('scroll', updatePosition, true);
            window.addEventListener('resize', updatePosition);

            return () => {
                window.removeEventListener('scroll', updatePosition, true);
                window.removeEventListener('resize', updatePosition);
            };
        }
    }, [showDropdown, dropdownPosition]);

    // Close dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            // Check if click is inside the wrapper (input) OR inside the potential fixed dropdown logic
            // But since the fixed dropdown is rendered inside the wrapper in DOM (just positioned fixed visually),
            // wrapperRef.contains(event.target) should still work if the dropdown is a child.
            // Wait, if I use position: fixed, it's still in the DOM tree under wrapperRef, so contains check works.
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setShowDropdown(false);
            }
        }

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = e.target.value;
        setInputValue(newValue);
        setShowDropdown(true);
        setHighlightedIndex(-1);
    };

    const handleOptionClick = (option: string) => {
        setInputValue(option);
        onChange(option);
        setShowDropdown(false);
        setHighlightedIndex(-1);
    };

    const handleInputFocus = () => {
        setShowDropdown(true);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (!showDropdown) {
            if (e.key === 'ArrowDown' || e.key === 'Enter') {
                setShowDropdown(true);
            }
            return;
        }

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                setHighlightedIndex(prev =>
                    prev < filteredOptions.length - 1 ? prev + 1 : prev
                );
                break;
            case 'ArrowUp':
                e.preventDefault();
                setHighlightedIndex(prev => (prev > 0 ? prev - 1 : -1));
                break;
            case 'Enter':
                e.preventDefault();
                if (highlightedIndex >= 0 && highlightedIndex < filteredOptions.length) {
                    handleOptionClick(filteredOptions[highlightedIndex]);
                }
                break;
            case 'Escape':
                setShowDropdown(false);
                setHighlightedIndex(-1);
                break;
        }
    };

    // Scroll highlighted option into view
    useEffect(() => {
        if (highlightedIndex >= 0 && wrapperRef.current) {
            const dropdown = wrapperRef.current.querySelector(`.${styles.dropdown}`);
            const highlightedElement = dropdown?.children[highlightedIndex] as HTMLElement;
            if (highlightedElement) {
                highlightedElement.scrollIntoView({ block: 'nearest' });
            }
        }
    }, [highlightedIndex]);

    return (
        <div className={styles.searchableSelect} ref={wrapperRef}>
            {label && (
                <label htmlFor={id} className={styles.label}>
                    {label}
                </label>
            )}
            <input
                ref={inputRef}
                type="text"
                id={id}
                className={styles.input}
                value={inputValue}
                onChange={handleInputChange}
                onFocus={handleInputFocus}
                onKeyDown={handleKeyDown}
                placeholder={placeholder}
                disabled={disabled}
                required={required}
                autoComplete="off"
                aria-autocomplete="list"
                aria-controls={`${id}-dropdown`}
                aria-expanded={showDropdown}
            />

            {showDropdown && !disabled && (
                <div
                    id={`${id}-dropdown`}
                    className={styles.dropdown}
                    role="listbox"
                    style={dropdownPosition === 'fixed' ? fixedStyles : undefined}
                >
                    {filteredOptions.length > 0 ? (
                        filteredOptions.map((option, index) => (
                            <div
                                key={option}
                                className={`${styles.option} ${index === highlightedIndex ? styles.highlighted : ''
                                    }`}
                                onClick={() => handleOptionClick(option)}
                                role="option"
                                aria-selected={option === value}
                            >
                                {option}
                            </div>
                        ))
                    ) : (
                        <div className={styles.noResults}>No district found</div>
                    )}
                </div>
            )}
        </div>
    );
}

