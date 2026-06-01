import { NextRequest, NextResponse } from 'next/server';

// DATABASE MAKANAN
const FOOD_DB: Record<string, any> = {
  // GRUP HIJAU (Prioritas Utama untuk Bowl/Salad)
  'salad segar': { calories: 85, serving: '1 mangkok', category: 'Sayuran', tip: 'Rendah kalori, tinggi serat. Hindari dressing creamy.' },
  'gado gado': { calories: 190, serving: '1 porsi', category: 'Sayuran', tip: 'Bumbu kacang tinggi protein.' },
  'sayur bayam': { calories: 23, serving: '100g', category: 'Sayuran', tip: 'Zat besi tinggi.' },
  
  // GRUP KUNING
  'pisang': { calories: 89, serving: '1 buah', category: 'Buah', tip: 'Kaya potassium & energi.' },
  'telur dadar': { calories: 180, serving: '2 butir', category: 'Protein', tip: 'Protein tinggi. Perhatikan minyak.' },
  'mie ayam': { calories: 320, serving: '1 porsi', category: 'Karbohidrat', tip: 'Tinggi sodium.' },
  
  // GRUP COKLAT
  'ayam goreng': { calories: 250, serving: '1 potong', category: 'Protein', tip: 'Tinggi lemak jenuh.' },
  'nasi goreng': { calories: 275, serving: '1 porsi', category: 'Karbohidrat', tip: 'Tinggi karbohidrat.' },
  'rendang': { calories: 290, serving: '100g', category: 'Protein', tip: 'Tinggi kalori.' },
  
  // GRUP MERAH
  'pizza': { calories: 285, serving: '1 slice', category: 'Karbohidrat', tip: 'Tinggi lemak & sodium.' },
  
  // GRUP PUTIH
  'nasi padang': { calories: 450, serving: '1 porsi', category: 'Karbohidrat', tip: 'Porsi besar.' },
  'soto ayam': { calories: 165, serving: '1 mangkok', category: 'Protein', tip: 'Kuah bening lebih sehat.' }
};

// MAPPING WARNA KE GRUP
const COLOR_GROUPS = {
  'green': ['salad segar', 'gado gado', 'sayur bayam'],
  'yellow': ['pisang', 'telur dadar', 'mie ayam'],
  'brown': ['ayam goreng', 'nasi goreng', 'rendang'],
  'red': ['pizza'],
  'white': ['nasi padang', 'soto ayam']
};

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const colorHint = formData.get('colorHint') as string;
    
    // Simulasi loading AI
    await new Promise(r => setTimeout(r, 1500));

    // 1. Ambil list makanan berdasarkan warna
    let group = COLOR_GROUPS[colorHint as keyof typeof COLOR_GROUPS];

    // 2. Fallback jika warna tidak terbaca
    if (!group) group = ['salad segar', 'nasi padang'];

    // 3. Pilih SATU item secara random dari grup yang benar
    const randomIndex = Math.floor(Math.random() * group.length);
    const selectedFood = group[randomIndex];
    
    const data = FOOD_DB[selectedFood];

    return NextResponse.json({
      food: selectedFood,
      calories: data.calories,
      range: [data.calories - 20, data.calories + 20],
      serving: data.serving,
      confidence: Math.floor(Math.random() * (95 - 85) + 85),
      tip: data.tip,
      category: data.category
    });

  } catch (error) {
    return NextResponse.json({ error: 'Gagal' }, { status: 500 });
  }
}