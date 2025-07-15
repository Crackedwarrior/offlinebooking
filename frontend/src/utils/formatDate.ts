export const formatSafeDate = (date: any) => {
  try {
    const parsed = new Date(date);
    return isNaN(parsed.getTime()) ? "Invalid date" : parsed.toLocaleDateString();
  } catch {
    return "Invalid date";
  }
}; 