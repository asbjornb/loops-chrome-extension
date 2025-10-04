(function () {
  function formatRelativeTime(isoString) {
    if (!isoString) {
      return 'just now';
    }

    const date = new Date(isoString);
    if (Number.isNaN(date.getTime())) {
      return 'just now';
    }

    const now = new Date();
    const diffMs = now - date;
    if (diffMs <= 0) {
      return 'just now';
    }

    const minutes = Math.floor(diffMs / 60000);
    if (minutes < 1) {
      return 'just now';
    }

    if (minutes < 60) {
      return `${minutes}m ago`;
    }

    const hours = Math.floor(minutes / 60);
    if (hours < 24) {
      return `${hours}h ago`;
    }

    const days = Math.floor(hours / 24);
    if (days < 7) {
      return `${days}d ago`;
    }

    const weeks = Math.floor(days / 7);
    if (weeks < 4) {
      return `${weeks}w ago`;
    }

    const months = Math.floor(days / 30);
    if (months < 12) {
      return `${months}mo ago`;
    }

    const years = Math.floor(days / 365);
    return `${years}y ago`;
  }

  window.loopsUtils = window.loopsUtils || {};
  window.loopsUtils.formatRelativeTime = formatRelativeTime;
})();
