export async function parseCSV(fileBuffer: Buffer): Promise<Record<string, any>[]> {
  const content = fileBuffer.toString('utf-8');
  const lines = content.split(/\r?\n/).filter(line => line.trim() !== '');
  
  if (lines.length === 0) return [];

  // Assuming first line is header
  const headers = lines[0].split(',').map(h => h.trim());
  const results: Record<string, any>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const rawLine = lines[i];
    // Simple regex to handle commas inside quotes
    const values = rawLine.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || rawLine.split(',');
    
    const rowObj: Record<string, any> = {};
    headers.forEach((header, index) => {
      let val = values[index] ? values[index].trim() : '';
      if (val.startsWith('"') && val.endsWith('"')) {
        val = val.substring(1, val.length - 1);
      }
      rowObj[header] = val;
    });
    
    results.push(rowObj);
  }

  return results;
}
