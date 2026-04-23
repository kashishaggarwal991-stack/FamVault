import { useRef } from 'react';

const OTP_LENGTH = 6;

export default function OtpInput({ value = '', onChange, error = false, disabled = false }) {
  const inputsRef = useRef([]);
  const digits = Array.from({ length: OTP_LENGTH }, (_, index) => value[index] || '');

  const updateDigit = (index, nextValue) => {
    const nextDigits = [...digits];
    nextDigits[index] = nextValue;
    onChange(nextDigits.join(''));
  };

  const handleChange = (index, event) => {
    const digit = event.target.value.replace(/\D/g, '').slice(-1);
    updateDigit(index, digit);

    if (digit && index < OTP_LENGTH - 1) {
      inputsRef.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index, event) => {
    if (event.key === 'Backspace' && !digits[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
  };

  const handlePaste = (event) => {
    event.preventDefault();
    const pastedDigits = event.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LENGTH);
    onChange(pastedDigits);
    const focusIndex = Math.min(pastedDigits.length, OTP_LENGTH - 1);
    inputsRef.current[focusIndex]?.focus();
  };

  return (
    <div className="flex justify-center gap-2 sm:gap-3">
      {digits.map((digit, index) => (
        <input
          key={index}
          ref={(node) => {
            inputsRef.current[index] = node;
          }}
          type="text"
          inputMode="numeric"
          pattern="[0-9]"
          maxLength={1}
          value={digit}
          disabled={disabled}
          onChange={(event) => handleChange(index, event)}
          onKeyDown={(event) => handleKeyDown(index, event)}
          onPaste={handlePaste}
          className={`h-12 w-10 rounded-xl border bg-slate-950 text-center text-xl font-semibold text-white outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-500/20 sm:h-14 sm:w-12 ${
            error ? 'border-rose-400' : 'border-white/10'
          } disabled:cursor-not-allowed disabled:opacity-60`}
          aria-label={`OTP digit ${index + 1}`}
        />
      ))}
    </div>
  );
}
