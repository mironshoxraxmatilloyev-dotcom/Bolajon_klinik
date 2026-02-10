import React from 'react';

const PhoneInput = ({ value, onChange, className = '', placeholder = '+998 XX XXX XX XX', required = false, ...props }) => {
  const handlePhoneChange = (e) => {
    let inputValue = e.target.value;
    
    // Faqat raqamlar va + belgisini qoldirish
    inputValue = inputValue.replace(/[^\d+]/g, '');
    
    // Agar foydalanuvchi +998 ni o'chirmoqchi bo'lsa, oldini olish
    if (!inputValue.startsWith('+998')) {
      inputValue = '+998' + inputValue.replace(/^\+?998?/, '');
    }
    
    // Maksimal uzunlik: +998 + 9 raqam = 13
    if (inputValue.length > 13) {
      inputValue = inputValue.slice(0, 13);
    }
    
    // onChange ni chaqirish
    if (onChange) {
      const syntheticEvent = {
        ...e,
        target: {
          ...e.target,
          value: inputValue
        }
      };
      onChange(syntheticEvent);
    }
  };

  // Agar value bo'sh bo'lsa, +998 ni o'rnatish
  const displayValue = value || '+998';

  return (
    <input
      type="tel"
      value={displayValue}
      onChange={handlePhoneChange}
      className={className}
      placeholder={placeholder}
      required={required}
      {...props}
    />
  );
};

export default PhoneInput;
