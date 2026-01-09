const XLSX = require('xlsx');
const path = require('path');

const filePath = path.resolve(__dirname, '../public/bao_cao_ton_kho_chi_tiet_temple.xlsx');

console.log('='.repeat(80));
console.log('ANALYZING EXCEL TEMPLATE:', filePath);
console.log('='.repeat(80));

try {
  const workbook = XLSX.readFile(filePath, {
    cellDates: true,
    cellFormula: true,
    cellStyles: false
  });

  console.log('\n📊 BASIC INFO:');
  console.log(`- Sheet Names: ${workbook.SheetNames.join(', ')}`);
  console.log(`- Total Sheets: ${workbook.SheetNames.length}`);

  workbook.SheetNames.forEach((sheetName, sheetIndex) => {
    const sheet = workbook.Sheets[sheetName];
    const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1');
    const rawData = XLSX.utils.sheet_to_json(sheet, { header: 1 });

    console.log(`\n${'='.repeat(80)}`);
    console.log(`📋 SHEET ${sheetIndex + 1}: "${sheetName}"`);
    console.log('='.repeat(80));

    console.log(`\n📐 DIMENSIONS:`);
    console.log(`- Range: ${sheet['!ref']}`);
    console.log(`- Total Rows: ${range.e.r + 1}`);
    console.log(`- Total Columns: ${range.e.c + 1}`);

    // Merged cells
    const merges = sheet['!merges'] || [];
    if (merges.length > 0) {
      console.log(`\n🔗 MERGED CELLS (${merges.length}):`);
      merges.forEach((merge, i) => {
        const rangeStr = XLSX.utils.encode_range(merge);
        console.log(`  ${i + 1}. ${rangeStr}`);
      });
    }

    // Print first 15 rows to understand structure
    console.log(`\n📝 FIRST 15 ROWS (structure analysis):`);
    rawData.slice(0, 15).forEach((row, rowIndex) => {
      const rowNum = rowIndex + 1;
      const rowContent = row.map((cell, colIndex) => {
        const col = XLSX.utils.encode_col(colIndex);
        if (cell === undefined || cell === null || cell === '') return null;
        return `${col}:${typeof cell === 'string' ? `"${cell.substring(0, 30)}${cell.length > 30 ? '...' : ''}"` : cell}`;
      }).filter(Boolean).join(' | ');
      
      if (rowContent) {
        console.log(`  Row ${rowNum}: ${rowContent}`);
      } else {
        console.log(`  Row ${rowNum}: (empty)`);
      }
    });

    // Detect header row
    console.log(`\n🔍 HEADER ANALYSIS:`);
    
    // Check each row for potential headers
    for (let r = 0; r < Math.min(10, rawData.length); r++) {
      const row = rawData[r];
      const nonEmptyCells = row.filter(cell => cell !== undefined && cell !== null && cell !== '').length;
      const stringCells = row.filter(cell => typeof cell === 'string').length;
      
      if (nonEmptyCells >= 3 && stringCells >= nonEmptyCells * 0.5) {
        console.log(`  Potential header at Row ${r + 1}:`);
        row.forEach((cell, colIndex) => {
          if (cell !== undefined && cell !== null && cell !== '') {
            const col = XLSX.utils.encode_col(colIndex);
            console.log(`    - Column ${col}: "${cell}"`);
          }
        });
      }
    }

    // Column analysis from data rows
    console.log(`\n📊 COLUMN DATA TYPE ANALYSIS (from sample data):`);
    const dataStartRow = findDataStartRow(rawData);
    console.log(`  Data starts at row: ${dataStartRow + 1}`);
    
    if (dataStartRow < rawData.length) {
      const sampleData = rawData.slice(dataStartRow, dataStartRow + 10);
      const maxCols = Math.max(...sampleData.map(r => r.length));
      
      for (let c = 0; c < maxCols; c++) {
        const col = XLSX.utils.encode_col(c);
        const values = sampleData.map(row => row[c]).filter(v => v !== undefined && v !== null && v !== '');
        
        if (values.length > 0) {
          const types = [...new Set(values.map(v => detectType(v)))];
          const samples = values.slice(0, 3).map(v => 
            typeof v === 'string' ? `"${v.substring(0, 20)}"` : v
          );
          console.log(`  Column ${col}: Types=[${types.join(', ')}] Samples=[${samples.join(', ')}]`);
        }
      }
    }
  });

} catch (error) {
  console.error('Error reading file:', error.message);
}

function findDataStartRow(data) {
  // Find first row with numeric data (likely data row, not header)
  for (let r = 0; r < data.length; r++) {
    const row = data[r];
    const hasNumeric = row.some(cell => typeof cell === 'number');
    if (hasNumeric) return r;
  }
  return 0;
}

function detectType(value) {
  if (value === null || value === undefined) return 'null';
  if (value instanceof Date) return 'date';
  if (typeof value === 'number') return Number.isInteger(value) ? 'integer' : 'decimal';
  if (typeof value === 'boolean') return 'boolean';
  if (typeof value === 'string') {
    if (/^\d{4}-\d{2}-\d{2}/.test(value)) return 'date-string';
    if (/^\d+$/.test(value)) return 'numeric-string';
    if (/^\d+[.,]\d+$/.test(value)) return 'decimal-string';
    return 'string';
  }
  return typeof value;
}
