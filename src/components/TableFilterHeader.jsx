import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Filter, Check } from 'lucide-react';

const TableFilterHeader = ({ title, options, selectedValues, onChange }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [coords, setCoords] = useState({ top: 0, left: 0 });
    const buttonRef = useRef(null);

    const toggleOpen = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!isOpen) {
            const rect = buttonRef.current.getBoundingClientRect();
            // Ensure visualization within viewport
            const dropdownWidth = 256; // w-64 is 16rem = 256px
            let left = rect.left;

            // Check if right side of dropdown would go off screen
            if (left + dropdownWidth > window.innerWidth) {
                // Align right edge of dropdown with right edge of button, or just shift it left
                // Better UX: Align right edge of dropdown with right edge of button if possible
                // but if button is small, just shift it so it ends at window width - padding
                left = Math.max(10, window.innerWidth - dropdownWidth - 20);
            }

            setCoords({
                top: rect.bottom + 4,
                left: left
            });
            setIsOpen(true);
        } else {
            setIsOpen(false);
        }
    };

    // Close on any scroll to avoid detached popup
    useEffect(() => {
        if (isOpen) {
            const handleScroll = () => setIsOpen(false);
            window.addEventListener('scroll', handleScroll, true);
            return () => window.removeEventListener('scroll', handleScroll, true);
        }
    }, [isOpen]);

    return (
        <>
            <button
                ref={buttonRef}
                onClick={toggleOpen}
                className={`flex items-center gap-2 font-semibold text-sm uppercase tracking-wider hover:text-blue-600 transition-colors ${selectedValues && selectedValues.length > 0 ? 'text-blue-600' : 'text-slate-500'}`}
            >
                {title}
                <Filter size={14} className={selectedValues && selectedValues.length ? 'fill-current' : ''} />
            </button>
            {isOpen && <DropdownPortal
                coords={coords}
                options={options}
                selectedValues={selectedValues || []}
                onChange={onChange}
                onClose={() => setIsOpen(false)}
            />}
        </>
    );
};

const DropdownPortal = ({ coords, options, selectedValues, onChange, onClose }) => {
    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-start justify-start" onClick={onClose}>
            <div
                className="absolute bg-white rounded-xl shadow-xl border border-slate-100 py-2 w-64 animate-in fade-in zoom-in-95 duration-200"
                style={{ top: coords.top, left: coords.left }}
                onClick={e => e.stopPropagation()}
            >
                <div className="max-h-64 overflow-y-auto px-2 space-y-1 custom-scrollbar">
                    {options.length > 0 ? options.map(option => (
                        <label key={option} className="flex items-center gap-3 px-2 py-2 hover:bg-slate-50 rounded-lg cursor-pointer transition-colors select-none">
                            <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors flex-shrink-0 ${selectedValues.includes(option) ? 'bg-blue-600 border-blue-600' : 'border-slate-300 bg-white'}`}>
                                {selectedValues.includes(option) && <Check size={10} className="text-white" />}
                            </div>
                            <span className="text-sm text-slate-700 font-medium truncate">{option}</span>
                            <input
                                type="checkbox"
                                className="hidden"
                                checked={selectedValues.includes(option)}
                                onChange={() => {
                                    const newValues = selectedValues.includes(option)
                                        ? selectedValues.filter(v => v !== option)
                                        : [...selectedValues, option];
                                    onChange(newValues);
                                }}
                            />
                        </label>
                    )) : (
                        <div className="px-4 py-2 text-sm text-slate-400 italic">No options available</div>
                    )}
                </div>
                {(selectedValues.length > 0) && (
                    <div className="border-t border-slate-100 mt-2 pt-2 px-2">
                        <button
                            onClick={() => { onChange([]); onClose(); }}
                            className="w-full py-1.5 text-xs font-medium text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        >
                            Clear Filter
                        </button>
                    </div>
                )}
            </div>
        </div>,
        document.body
    );
};

export default TableFilterHeader;
