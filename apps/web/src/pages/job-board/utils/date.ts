export const addMinutes = (date: Date, minutes: number) => {
  const next = new Date(date);
  next.setMinutes(date.getMinutes() + minutes);
  return next;
};

export const subDays = (date: Date, days: number) => {
  const next = new Date(date);
  next.setDate(date.getDate() - days);
  return next;
};

export const formatDate = (value?: string | null) => {
  if (!value) return "";
  const date = new Date(value);
  return Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
};

export const formatTime = (value?: string | null) => {
  if (!value) return "";
  const date = new Date(value);
  return Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
};

export const formatRelativeLabel = (value?: string | null) => {
  if (!value) return "";
  const date = new Date(value);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return "Today";
  }

  if (diffDays === 1) {
    return "Yesterday";
  }

  if (diffDays < 7) {
    return `${diffDays} days ago`;
  }

  return formatDate(value);
};
