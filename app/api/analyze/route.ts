import { NextRequest, NextResponse } from 'next/server';

const FOOD_DB: Record<string, any> = {
  'nasi': { calories: 206, serving: '100g', category: 'Karbohidrat', tip: 'Tinggi karbohidrat. Kombinasikan dengan protein.' },
  'nasi goreng': { calories: 275, serving: '1 porsi', category: 'Karbohidrat', tip: 'Kurangi porsi minyak dan tambahkan sayuran.' },
  'ayam': { calories: 239, serving: '100g', category: 'Protein', tip: 'Pilihan protein baik. Pilih dada ayam.' },
  'ayam goreng': { calories: 300, serving: '1 potong', category: 'Protein', tip: 'Tinggi lemak jenuh. Batasi konsumsi.' },
  'salad': { calories: 85, serving: '1 mangkok', category: 'Sayuran', tip: 'Sangat sehat. Hindari dressing creamy.' },
  'pizza': { calories: 285, serving: '1 slice', category: 'Karbohidrat', tip: 'Tinggi kalori. Makan bersama salad.' },
  'buah': { calories: 60, serving: '1 buah', category: 'Buah', tip: 'Sumber serat dan vitamin C yang baik.' },
  'mie': { calories: 200, serving: '1 porsi', category: 'Karbohidrat', tip: 'Tinggi natrium. Perbanyak air minum.' },
};

export async function POST(req: NextRequest) {
  try {
    await req.formData();
    
    // Simulasi delay AI (biar terlihat canggih)
    await new Promise(r => setTimeout(r, 1500));

    const foods = Object.keys(FOOD_DB);
    const randomFood = foods[Math.floor(Math.random() * foods.length)];
    const data = FOOD_DB[randomFood];

    return NextResponse.json({
      food: randomFood,
      calories: data.calories + Math.floor(Math.random() * 20), // Variasi random
      range: [data.calories - 20, data.calories + 20],
      serving: data.serving,
      confidence: Math.floor(Math.random() * (98 - 88) + 88), // 88-98%
      tip: data.tip,
      category: data.category
    });
  } catch (e) {
    return NextResponse.json({ error: 'Error' }, { status: 500 });
  }
}