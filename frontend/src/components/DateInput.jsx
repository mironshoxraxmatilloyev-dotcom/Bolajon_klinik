import React, { useState, useEffect } from 'react';

// DD/MM/YYYY formatida sana inputi
const DateInput = ({ value, onChange, className = '', required = false, ...props }) => {
  const [displayValue, setDisplayValue] = useState('');

  // YYYY-MM-DD formatini DD/MM/YYYY ga o'zgartirish
  useEffect(() => {
    if (value) {
      const [year, month, day] = value.split('-');
      if (year && month && day) {
        setDisplayValue(`${day}/${month}/${year}`);
      }
    } else {
      setDisplayValue('');
    }
  }, [value]);

  const handleInputChange = (e) => {
    let input = e.target.value;
    
    // Faqat raqamlar va / belgisini qoldirish
    input = input.replace(/[^\d/]/g, '');
    
    // Agar foydalanuvchi / ni o'chirsa, avtomatik qo'shish
    const numbers = input.replace(/\//g, '');
    
    let formatted = '';
    if (numbers.length > 0) {
      // Kun (maksimal 2 raqam)
      formatted = numbers.slice(0, 2);
      
      if (numbers.length >= 3) {
        // Oy (maksimal 2 raqam)
        formatted += '/' + numbers.slice(2, 4);
      }
      
      if (numbers.length >= 5) {
        // Yil (maksimal 4 raqam)
        formatted += '/' + numbers.slice(4, 8);
      }
    }
    
    setDisplayValue(formatted);
    
    // Agar to'liq sana kiritilgan bo'lsa (DD/MM/YYYY)
    if (numbers.length === 8) {
      const day = numbers.slice(0, 2);
      const month = numbers.slice(2, 4);
      const year = numbers.slice(4, 8);
      
      // Sanani validatsiya qilish
      const dayNum = parseInt(day);
      const monthNum = parseInt(month);
      const yearNum = parseInt(year);
      
      if (dayNum >= 1 && dayNum <= 31 && monthNum >= 1 && monthNum <= 12 && yearNum >= 1900 && yearNum <= 2100) {
        // YYYY-MM-DD formatida qaytarish
        const isoDate = `${year}-${month}-${day}`;
        
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
    } else if (numbers.length === 0) {
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
    // Backspace, Delete, Tab, Arrow keys va boshqa navigatsiya tugmalariga ruxsat berish
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
    
    // Faqat raqamlarga ruxsat berish
    if (!/^\d$/.test(e.key)) {
      e.preventDefault();
    }
  };

  return (
    <div className="relative w-full">
      <input
        type="text"
        value={displayValue}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        className={`pr-10 ${className}`}
        required={required}
        placeholder="KK/OO/YYYY"
        maxLength={10}
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

export default DateInput;
