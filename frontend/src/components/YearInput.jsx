import React, { useState, useEffect } from 'react';

const YearInput = ({ value, onChange, className = '', required = false, ...props }) => {
  const [year, setYear] = useState('');

  // YYYY-MM-DD formatidan yilni ajratib olish
  useEffect(() => {
    if (value) {
      const [yearPart] = value.split('-');
      if (yearPart) {
        setYear(yearPart);
      }
    } else {
      setYear('');
    }
  }, [value]);

  const handleYearChange = (e) => {
    let inputValue = e.target.value;
    
    // Faqat raqamlar
    inputValue = inputValue.replace(/\D/g, '');
    
    // Maksimal 4 ta raqam
    if (inputValue.length > 4) {
      inputValue = inputValue.slice(0, 4);
    }
    
    setYear(inputValue);
    
    // Agar 4 ta raqam kiritilgan bo'lsa, YYYY-01-01 formatida qaytarish
    if (inputValue.length === 4) {
      const yearNum = parseInt(inputValue);
      const currentYear = new Date().getFullYear();
      
      if (yearNum >= 1900 && yearNum <= currentYear) {
        const isoDate = `${inputValue}-01-01`;
        
        if (onChange) {
          onChange({
            ...e,
            target: {
              ...e.target,
              value: isoDate,
              name: e.target.name
            }
          });
        }
      }
    } else if (inputValue.length === 0) {
      // Bo'sh qiymat
      if (onChange) {
        onChange({
          ...e,
          target: {
            ...e.target,
            value: '',
            name: e.target.name
          }
        });
      }
    }
  };

  const handleKeyDown = (e) => {
    // Backspace, Delete, Tab, Arrow keys ga ruxsat
    if (
      e.key === 'Backspace' ||
      e.key === 'Delete' ||
      e.key === 'Tab' ||
      e.key === 'ArrowLeft' ||
      e.key === 'ArrowRight' ||
      e.key === 'Home' ||
      e.key === 'End'
    ) {
      return;
    }
    
    // Faqat raqamlarga ruxsat
    if (!/^\d$/.test(e.key)) {
      e.preventDefault();
    }
  };

  return (
    <div className="relative w-full">
      <input
        type="text"
        value={year}
        onChange={handleYearChange}
        onKeyDown={handleKeyDown}
        className={`pr-10 ${className}`}
        required={required}
        placeholder="YYYY"
        maxLength={4}
        inputMode="numeric"
        autoComplete="off"
        {...props}
      />
      <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
        <span className="material-symbols-outlined text-xl">calendar_today</span>
      </div>
    </div>
  );
};

export default YearInput;
