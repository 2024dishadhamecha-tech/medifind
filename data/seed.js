// Demo data for MediFind. Pharmacy names/phone numbers are FICTIONAL sample data.
// Replace with real pharmacy records (or a database) for production use.

const pharmacies = [
  { id: 'p1',  name: 'CityCare Pharmacy',        area: 'Andheri West', address: 'Shop 4, Link Road, Andheri West, Mumbai 400053',   phone: '+91 22 5550 0101', lat: 19.1364, lng: 72.8296, hours: '8:00 AM – 11:00 PM' },
  { id: 'p2',  name: 'HealthPlus Medicals',      area: 'Bandra West',  address: '12, Hill Road, Bandra West, Mumbai 400050',        phone: '+91 22 5550 0102', lat: 19.0596, lng: 72.8295, hours: '24 hours' },
  { id: 'p3',  name: 'Sanjivani Chemist',        area: 'Dadar',        address: 'Near Dadar Station, Dadar East, Mumbai 400014',    phone: '+91 22 5550 0103', lat: 19.0178, lng: 72.8478, hours: '7:00 AM – 10:30 PM' },
  { id: 'p4',  name: 'Apex Wellness Pharmacy',   area: 'Borivali',     address: 'SV Road, Borivali West, Mumbai 400092',            phone: '+91 22 5550 0104', lat: 19.2307, lng: 72.8567, hours: '8:30 AM – 10:00 PM' },
  { id: 'p5',  name: 'LifeLine Medico',          area: 'Powai',        address: 'Hiranandani Gardens, Powai, Mumbai 400076',        phone: '+91 22 5550 0105', lat: 19.1176, lng: 72.9060, hours: '9:00 AM – 11:00 PM' },
  { id: 'p6',  name: 'Thane Care Chemists',      area: 'Thane West',   address: 'Gokhale Road, Naupada, Thane West 400602',         phone: '+91 22 5550 0106', lat: 19.2183, lng: 72.9781, hours: '8:00 AM – 10:00 PM' },
  { id: 'p7',  name: 'Colaba Central Pharmacy',  area: 'Colaba',       address: 'Colaba Causeway, Mumbai 400005',                   phone: '+91 22 5550 0107', lat: 18.9067, lng: 72.8147, hours: '24 hours' },
  { id: 'p8',  name: 'Juhu Health Mart',         area: 'Juhu',         address: 'Juhu Tara Road, Juhu, Mumbai 400049',              phone: '+91 22 5550 0108', lat: 19.1075, lng: 72.8263, hours: '9:00 AM – 10:00 PM' },
  { id: 'p9',  name: 'Kurla Family Pharmacy',    area: 'Kurla',        address: 'LBS Marg, Kurla West, Mumbai 400070',              phone: '+91 22 5550 0109', lat: 19.0726, lng: 72.8845, hours: '8:00 AM – 11:30 PM' },
  { id: 'p10', name: 'Malad MediPoint',          area: 'Malad West',   address: 'Link Road, Malad West, Mumbai 400064',             phone: '+91 22 5550 0110', lat: 19.1874, lng: 72.8484, hours: '8:00 AM – 10:30 PM' },
  { id: 'p11', name: 'Ghatkopar Jan Aushadhi',   area: 'Ghatkopar',    address: 'LBS Marg, Ghatkopar West, Mumbai 400086',          phone: '+91 22 5550 0111', lat: 19.0860, lng: 72.9081, hours: '9:00 AM – 9:00 PM' },
  { id: 'p12', name: 'Vashi Total Health',       area: 'Vashi',        address: 'Sector 17, Vashi, Navi Mumbai 400703',             phone: '+91 22 5550 0112', lat: 19.0745, lng: 72.9978, hours: '24 hours' },
  { id: 'p13', name: 'Chembur Care Pharmacy',    area: 'Chembur',      address: 'Diamond Garden Road, Chembur, Mumbai 400071',      phone: '+91 22 5550 0113', lat: 19.0522, lng: 72.9005, hours: '8:00 AM – 11:00 PM' }
];

const medicines = [
  { id: 'm1',  name: 'Paracetamol 500 mg',          generic: 'Paracetamol',            brands: ['Crocin', 'Calpol'],         category: 'Pain & Fever',     form: 'Tablet' },
  { id: 'm2',  name: 'Paracetamol 650 mg',          generic: 'Paracetamol',            brands: ['Dolo 650'],                 category: 'Pain & Fever',     form: 'Tablet' },
  { id: 'm3',  name: 'Ibuprofen 400 mg',            generic: 'Ibuprofen',              brands: ['Brufen'],                   category: 'Pain & Fever',     form: 'Tablet' },
  { id: 'm4',  name: 'Diclofenac 50 mg',            generic: 'Diclofenac',             brands: ['Voveran'],                  category: 'Pain & Fever',     form: 'Tablet' },
  { id: 'm5',  name: 'Azithromycin 500 mg',         generic: 'Azithromycin',           brands: ['Azithral', 'Zithromax'],    category: 'Antibiotic',       form: 'Tablet' },
  { id: 'm6',  name: 'Amoxicillin + Clavulanic Acid 625 mg', generic: 'Amoxicillin/Clavulanate', brands: ['Augmentin', 'Clavam'], category: 'Antibiotic',  form: 'Tablet' },
  { id: 'm7',  name: 'Cefixime 200 mg',             generic: 'Cefixime',               brands: ['Taxim-O'],                  category: 'Antibiotic',       form: 'Tablet' },
  { id: 'm8',  name: 'Ciprofloxacin 500 mg',        generic: 'Ciprofloxacin',          brands: ['Ciplox'],                   category: 'Antibiotic',       form: 'Tablet' },
  { id: 'm9',  name: 'Cetirizine 10 mg',            generic: 'Cetirizine',             brands: ['Cetzine', 'Okacet'],        category: 'Allergy',          form: 'Tablet' },
  { id: 'm10', name: 'Montelukast 10 mg',           generic: 'Montelukast',            brands: ['Montair'],                  category: 'Allergy & Asthma', form: 'Tablet' },
  { id: 'm11', name: 'Salbutamol Inhaler 100 mcg',  generic: 'Salbutamol',             brands: ['Asthalin'],                 category: 'Allergy & Asthma', form: 'Inhaler' },
  { id: 'm12', name: 'Pantoprazole 40 mg',          generic: 'Pantoprazole',           brands: ['Pantocid', 'Pan 40'],       category: 'Acidity & Stomach', form: 'Tablet' },
  { id: 'm13', name: 'Omeprazole 20 mg',            generic: 'Omeprazole',             brands: ['Omez'],                     category: 'Acidity & Stomach', form: 'Capsule' },
  { id: 'm14', name: 'Domperidone 10 mg',           generic: 'Domperidone',            brands: ['Domstal'],                  category: 'Acidity & Stomach', form: 'Tablet' },
  { id: 'm15', name: 'Ondansetron 4 mg',            generic: 'Ondansetron',            brands: ['Emeset', 'Zofer'],          category: 'Acidity & Stomach', form: 'Tablet' },
  { id: 'm16', name: 'Loperamide 2 mg',             generic: 'Loperamide',             brands: ['Eldoper'],                  category: 'Acidity & Stomach', form: 'Capsule' },
  { id: 'm17', name: 'ORS Powder (Oral Rehydration Salts)', generic: 'ORS',            brands: ['Electral'],                 category: 'Hydration',        form: 'Sachet' },
  { id: 'm18', name: 'Metformin 500 mg',            generic: 'Metformin',              brands: ['Glycomet', 'Glucophage'],   category: 'Diabetes',         form: 'Tablet' },
  { id: 'm19', name: 'Glimepiride 2 mg',            generic: 'Glimepiride',            brands: ['Amaryl'],                   category: 'Diabetes',         form: 'Tablet' },
  { id: 'm20', name: 'Insulin Glargine 100 IU/mL',  generic: 'Insulin glargine',       brands: ['Lantus', 'Basalog'],        category: 'Diabetes',         form: 'Injection' },
  { id: 'm21', name: 'Amlodipine 5 mg',             generic: 'Amlodipine',             brands: ['Amlong', 'Norvasc'],        category: 'Heart & BP',       form: 'Tablet' },
  { id: 'm22', name: 'Telmisartan 40 mg',           generic: 'Telmisartan',            brands: ['Telma'],                    category: 'Heart & BP',       form: 'Tablet' },
  { id: 'm23', name: 'Losartan 50 mg',              generic: 'Losartan',               brands: ['Losar', 'Cozaar'],          category: 'Heart & BP',       form: 'Tablet' },
  { id: 'm24', name: 'Metoprolol 50 mg',            generic: 'Metoprolol',             brands: ['Metolar', 'Betaloc'],       category: 'Heart & BP',       form: 'Tablet' },
  { id: 'm25', name: 'Atorvastatin 10 mg',          generic: 'Atorvastatin',           brands: ['Atorva', 'Lipitor'],        category: 'Heart & BP',       form: 'Tablet' },
  { id: 'm26', name: 'Aspirin 75 mg',               generic: 'Aspirin',                brands: ['Ecosprin'],                 category: 'Heart & BP',       form: 'Tablet' },
  { id: 'm27', name: 'Clopidogrel 75 mg',           generic: 'Clopidogrel',            brands: ['Plavix', 'Clopilet'],       category: 'Heart & BP',       form: 'Tablet' },
  { id: 'm28', name: 'Levothyroxine 50 mcg',        generic: 'Levothyroxine',          brands: ['Thyronorm', 'Eltroxin'],    category: 'Thyroid',          form: 'Tablet' },
  { id: 'm29', name: 'Vitamin D3 60000 IU',         generic: 'Cholecalciferol',        brands: ['Calcirol', 'Uprise-D3'],    category: 'Vitamins',         form: 'Capsule' },
  { id: 'm30', name: 'Folic Acid 5 mg',             generic: 'Folic acid',             brands: ['Folvite'],                  category: 'Vitamins',         form: 'Tablet' }
];

// Small deterministic PRNG so the demo data is the same every time it is generated.
function mulberry32(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function buildInventory() {
  const rand = mulberry32(20261101);
  const now = Date.now();
  const inventory = [];
  for (const p of pharmacies) {
    for (const m of medicines) {
      if (rand() < 0.25) continue; // this pharmacy has no record for this medicine
      const r = rand();
      const status = r < 0.6 ? 'in_stock' : r < 0.8 ? 'low_stock' : 'out_of_stock';
      const hoursAgo = Math.floor(rand() * 72) + 1;
      inventory.push({
        pharmacyId: p.id,
        medicineId: m.id,
        status,
        updatedAt: new Date(now - hoursAgo * 3600 * 1000).toISOString(),
        reports: 1 + Math.floor(rand() * 4)
      });
    }
  }
  return inventory;
}

module.exports = { pharmacies, medicines, buildInventory };
