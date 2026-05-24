import * as XLSX from 'xlsx';

export interface ScanHistory {
  id: string;
  timestamp: string;
  food: string;
  calories: number;
  confidence: number;
  serving: string;
  tip: string;
  category: string;
}

export function exportToExcel(data: ScanHistory[]) {
  if (!data.length) return alert('Tidak ada data untuk di-export');

  const formattedData = data.map(item => ({
    'Tanggal': new Date(item.timestamp).toLocaleDateString('id-ID'),
    'Waktu': new Date(item.timestamp).toLocaleTimeString('id-ID'),
    'Makanan': item.food,
    'Kategori': item.category,
    'Kalori': item.calories,
    'Porsi': item.serving,
    'Akurasi AI (%)': item.confidence,
    'Saran Nutrisi': item.tip
  }));

  const ws = XLSX.utils.json_to_sheet(formattedData);
  
  // Set column widths
  ws['!cols'] = [
    {wch: 12}, {wch: 10}, {wch: 20}, {wch: 12}, {wch: 8}, {wch: 15}, {wch: 12}, {wch: 40}
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Data Nutrisi');
  XLSX.writeFile(wb, 'NutriScan_Report_' + new Date().toISOString().slice(0,10) + '.xlsx');
}