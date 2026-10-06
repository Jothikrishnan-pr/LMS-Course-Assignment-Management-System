const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function parsePagination(query) {
  const page = Math.max(parseInt(query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(query.limit, 10) || 10, 1), 100);
  return { page, limit, skip: (page - 1) * limit };
}

const buildMeta = (page, limit, total) => ({ page, limit, total, totalPages: Math.ceil(total / limit) || 1 });

module.exports = { parsePagination, buildMeta, escapeRegex };
