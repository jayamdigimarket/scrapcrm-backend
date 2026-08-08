const db = require('./db');

// Auto-generate next document number: MVR/INV/004/26-27
async function nextDocNumber(branchId, docType) {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const [rows] = await conn.query(
      'SELECT * FROM doc_series WHERE branch_id=? AND doc_type=? FOR UPDATE',
      [branchId, docType]
    );
    if (!rows.length) throw new Error(`No series found for ${docType}`);
    const series = rows[0];
    const nextNum = series.last_number + 1;
    const padded  = String(nextNum).padStart(3, '0');
    const docNo   = `${series.prefix}/${padded}/${series.financial_year}`;
    await conn.query(
      'UPDATE doc_series SET last_number=? WHERE branch_id=? AND doc_type=?',
      [nextNum, branchId, docType]
    );
    await conn.commit();
    return docNo;
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}

// Current financial year e.g. "26-27"
function getFinancialYear() {
  const now  = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const start = month >= 4 ? year : year - 1;
  return `${String(start).slice(-2)}-${String(start + 1).slice(-2)}`;
}

// Amount to words (Indian system)
function amountToWords(amount) {
  const ones = ['','One','Two','Three','Four','Five','Six','Seven','Eight','Nine',
    'Ten','Eleven','Twelve','Thirteen','Fourteen','Fifteen','Sixteen',
    'Seventeen','Eighteen','Nineteen'];
  const tens = ['','','Twenty','Thirty','Forty','Fifty','Sixty','Seventy','Eighty','Ninety'];

  function convert(n) {
    if (n === 0) return '';
    if (n < 20) return ones[n] + ' ';
    if (n < 100) return tens[Math.floor(n/10)] + ' ' + ones[n%10] + ' ';
    if (n < 1000) return ones[Math.floor(n/100)] + ' Hundred ' + convert(n%100);
    if (n < 100000) return convert(Math.floor(n/1000)) + 'Thousand ' + convert(n%1000);
    if (n < 10000000) return convert(Math.floor(n/100000)) + 'Lakh ' + convert(n%100000);
    return convert(Math.floor(n/10000000)) + 'Crore ' + convert(n%10000000);
  }

  const rounded = Math.round(amount);
  const paise   = Math.round((amount - rounded) * 100);
  let words = convert(rounded).trim() + ' Rupees';
  if (paise > 0) words += ' and ' + convert(paise).trim() + ' Paise';
  return words.trim() + ' Only';
}

module.exports = { nextDocNumber, getFinancialYear, amountToWords };
