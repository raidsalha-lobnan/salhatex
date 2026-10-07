export const formatDateDisplay = (dateStr: string): string => {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length === 3 && parts[0].length === 4) {
    return `${parseInt(parts[2], 10)}-${parseInt(parts[1], 10)}-${parts[0]}`;
  }
  return dateStr;
};

export const getTodayDateString = (): string => {
  const today = new Date();
  return today.toISOString().split('T')[0];
};

export const formatDecimalHours = (decimalHours: number, format: 'short' | 'long' | 'colon' = 'short'): string => {
  if (decimalHours === undefined || decimalHours === null || isNaN(decimalHours) || decimalHours <= 0) {
    return format === 'colon' ? '00:00' : '0 د';
  }
  const totalMinutes = Math.round(decimalHours * 60);
  const hrs = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;

  if (format === 'colon') {
    const pad = (num: number) => String(num).padStart(2, '0');
    return `${pad(hrs)}:${pad(mins)}`;
  }

  if (format === 'long') {
    if (hrs > 0 && mins > 0) {
      return `${hrs} ساعة و ${mins} دقيقة`;
    } else if (hrs > 0) {
      return `${hrs} ساعة`;
    } else {
      return `${mins} دقيقة`;
    }
  }

  // default 'short'
  if (hrs > 0 && mins > 0) {
    return `${hrs}س و ${mins}د`;
  } else if (hrs > 0) {
    return `${hrs}س`;
  } else {
    return `${mins}د`;
  }
};
