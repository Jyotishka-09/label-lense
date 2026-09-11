/**
 * indiaGeoMaster.js
 * -----------------
 * Authoritative Administrative Geographic Master Dataset for India.
 * Official Census / Local Government Directory (LGD) - Ministry of Panchayati Raj.
 * Contains ALL 28 States and 8 Union Territories with official ISO 3166-2:IN codes
 * and complete official administrative districts.
 */

export const INDIA_GEO_MASTER = [
  // ── 28 States ──────────────────────────────────────────────────────────────
  {
    code: 'AP',
    name: 'Andhra Pradesh',
    type: 'State',
    districts: [
      'Alluri Sitharama Raju', 'Anakapalli', 'Ananthapuramu', 'Annamayya',
      'Bapatla', 'Chittoor', 'Dr. B.R. Ambedkar Konaseema', 'East Godavari',
      'Eluru', 'Guntur', 'Kakinada', 'Krishna', 'Kurnool', 'Nandyal',
      'NTR', 'Palnadu', 'Parvathipuram Manyam', 'Prakasam',
      'Sri Potti Sriramulu Nellore', 'Sri Sathya Sai', 'Srikakulam',
      'Tirupati', 'Visakhapatnam', 'Vizianagaram', 'West Godavari', 'YSR Kadapa'
    ]
  },
  {
    code: 'AR',
    name: 'Arunachal Pradesh',
    type: 'State',
    districts: [
      'Anjaw', 'Changlang', 'Dibang Valley', 'East Kameng', 'East Siang',
      'Kamle', 'Kra Daadi', 'Kurung Kumey', 'Lepa Rada', 'Lohit', 'Longding',
      'Lower Dibang Valley', 'Lower Siang', 'Lower Subansiri', 'Namsai',
      'Pakke Kessang', 'Papum Pare', 'Shi Yomi', 'Siang', 'Tawang', 'Tirap',
      'Upper Dibang Valley', 'Upper Siang', 'Upper Subansiri', 'West Kameng', 'West Siang'
    ]
  },
  {
    code: 'AS',
    name: 'Assam',
    type: 'State',
    districts: [
      'Bajali', 'Baksa', 'Barpeta', 'Biswanath', 'Bongaigaon', 'Cachar',
      'Charaideo', 'Chirang', 'Darrang', 'Dhemaji', 'Dhubri', 'Dibrugarh',
      'Dima Hasao', 'Goalpara', 'Golaghat', 'Hailakandi', 'Hojai', 'Jorhat',
      'Kamrup', 'Kamrup Metropolitan', 'Karbi Anglong', 'Karimganj',
      'Kokrajhar', 'Lakhimpur', 'Majuli', 'Morigaon', 'Nagaon', 'Nalbari',
      'Sivasagar', 'Sonitpur', 'South Salmara-Mankachar', 'Tamulpur',
      'Tinsukia', 'Udalguri', 'West Karbi Anglong'
    ]
  },
  {
    code: 'BR',
    name: 'Bihar',
    type: 'State',
    districts: [
      'Araria', 'Arwal', 'Aurangabad', 'Banka', 'Begusarai', 'Bhagalpur',
      'Bhojpur', 'Buxar', 'Darbhanga', 'East Champaran', 'Gaya', 'Gopalganj',
      'Jamui', 'Jehanabad', 'Kaimur', 'Katihar', 'Khagaria', 'Kishanganj',
      'Lakhisarai', 'Madhepura', 'Madhubani', 'Munger', 'Muzaffarpur',
      'Nalanda', 'Nawada', 'Patna', 'Purnia', 'Rohtas', 'Saharsa',
      'Samastipur', 'Saran', 'Sheikhpura', 'Sheohar', 'Sitamarhi',
      'Siwan', 'Supaul', 'Vaishali', 'West Champaran'
    ]
  },
  {
    code: 'CG',
    name: 'Chhattisgarh',
    type: 'State',
    districts: [
      'Balod', 'Baloda Bazar', 'Balrampur', 'Bastar', 'Bemetara', 'Bijapur',
      'Bilaspur', 'Dantewada', 'Dhamtari', 'Durg', 'Gariaband',
      'Gaurela-Pendra-Marwahi', 'Janjgir-Champa', 'Jashpur', 'Kabirdham',
      'Kanker', 'Khairagarh-Chhuikhadan-Gandai', 'Kondagaon', 'Korba',
      'Koriya', 'Mahasamund', 'Manendragarh-Chirmiri-Bharatpur',
      'Mohla-Manpur-Ambagarh Chowki', 'Mungeli', 'Narayanpur', 'Raigarh',
      'Raipur', 'Rajnandgaon', 'Sakti', 'Sarangarh-Bilaigarh', 'Sukma',
      'Surajpur', 'Surguja'
    ]
  },
  {
    code: 'GA',
    name: 'Goa',
    type: 'State',
    districts: [
      'North Goa', 'South Goa'
    ]
  },
  {
    code: 'GJ',
    name: 'Gujarat',
    type: 'State',
    districts: [
      'Ahmedabad', 'Amreli', 'Anand', 'Aravalli', 'Banaskantha', 'Bharuch',
      'Bhavnagar', 'Botad', 'Chhota Udaipur', 'Dahod', 'Dang', 'Devbhumi Dwarka',
      'Gandhinagar', 'Gir Somnath', 'Jamnagar', 'Junagadh', 'Kheda', 'Kutch',
      'Mahisagar', 'Mehsana', 'Morbi', 'Narmada', 'Navsari', 'Panchmahal',
      'Patan', 'Porbandar', 'Rajkot', 'Sabarkantha', 'Surat', 'Surendranagar',
      'Tapi', 'Vadodara', 'Valsad'
    ]
  },
  {
    code: 'HR',
    name: 'Haryana',
    type: 'State',
    districts: [
      'Ambala', 'Bhiwani', 'Charkhi Dadri', 'Faridabad', 'Fatehabad', 'Gurugram',
      'Hisar', 'Jhajjar', 'Jind', 'Kaithal', 'Karnal', 'Kurukshetra',
      'Mahendragarh', 'Nuh', 'Palwal', 'Panchkula', 'Panipat', 'Rewari',
      'Rohtak', 'Sirsa', 'Sonipat', 'Yamunanagar'
    ]
  },
  {
    code: 'HP',
    name: 'Himachal Pradesh',
    type: 'State',
    districts: [
      'Bilaspur', 'Chamba', 'Hamirpur', 'Kangra', 'Kinnaur', 'Kullu',
      'Lahaul and Spiti', 'Mandi', 'Shimla', 'Sirmaur', 'Solan', 'Una'
    ]
  },
  {
    code: 'JH',
    name: 'Jharkhand',
    type: 'State',
    districts: [
      'Bokaro', 'Chatra', 'Deoghar', 'Dhanbad', 'Dumka', 'East Singhbhum',
      'Garhwa', 'Giridih', 'Godda', 'Gumla', 'Hazaribagh', 'Jamtara',
      'Khunti', 'Koderma', 'Latehar', 'Lohardaga', 'Pakur', 'Palamu',
      'Ramgarh', 'Ranchi', 'Sahibganj', 'Seraikela Kharsawan', 'Simdega', 'West Singhbhum'
    ]
  },
  {
    code: 'KA',
    name: 'Karnataka',
    type: 'State',
    districts: [
      'Bagalkot', 'Ballari', 'Belagavi', 'Bengaluru Rural', 'Bengaluru Urban',
      'Bidar', 'Chamarajanagar', 'Chikkaballapur', 'Chikkamagaluru', 'Chitradurga',
      'Dakshina Kannada', 'Davanagere', 'Dharwad', 'Gadag', 'Hassan', 'Haveri',
      'Kalaburagi', 'Kodagu', 'Kolar', 'Koppal', 'Mandya', 'Mysuru', 'Raichur',
      'Ramanagara', 'Shivamogga', 'Tumakuru', 'Udupi', 'Uttara Kannada',
      'Vijayanagara', 'Vijayapura', 'Yadgir'
    ]
  },
  {
    code: 'KL',
    name: 'Kerala',
    type: 'State',
    districts: [
      'Alappuzha', 'Ernakulam', 'Idukki', 'Kannur', 'Kasaragod', 'Kollam',
      'Kottayam', 'Kozhikode', 'Malappuram', 'Palakkad', 'Pathanamthitta',
      'Thiruvananthapuram', 'Thrissur', 'Wayanad'
    ]
  },
  {
    code: 'MP',
    name: 'Madhya Pradesh',
    type: 'State',
    districts: [
      'Agar Malwa', 'Alirajpur', 'Anuppur', 'Ashoknagar', 'Balaghat', 'Barwani',
      'Betul', 'Bhind', 'Bhopal', 'Burhanpur', 'Chhatarpur', 'Chhindwara',
      'Damoh', 'Datia', 'Dewas', 'Dhar', 'Dindori', 'Guna', 'Gwalior', 'Harda',
      'Indore', 'Jabalpur', 'Jhabua', 'Katni', 'Khandwa', 'Khargone', 'Maihar',
      'Mandla', 'Mandsaur', 'Mauganj', 'Morena', 'Narsinghpur', 'Neemuch',
      'Niwari', 'Narmadapuram', 'Pandhurna', 'Panna', 'Raisen', 'Rajgarh',
      'Ratlam', 'Rewa', 'Sagar', 'Satna', 'Sehore', 'Seoni', 'Shahdol',
      'Shajapur', 'Sheopur', 'Shivpuri', 'Sidhi', 'Singrauli', 'Tikamgarh',
      'Ujjain', 'Umaria', 'Vidisha'
    ]
  },
  {
    code: 'MH',
    name: 'Maharashtra',
    type: 'State',
    districts: [
      'Ahmednagar', 'Akola', 'Amravati', 'Beed', 'Bhandara', 'Buldhana',
      'Chandrapur', 'Chhatrapati Sambhaji Nagar', 'Dharashiv', 'Dhule',
      'Gadchiroli', 'Gondia', 'Hingoli', 'Jalgaon', 'Jalna', 'Kolhapur',
      'Latur', 'Mumbai City', 'Mumbai Suburban', 'Nagpur', 'Nanded', 'Nandurbar',
      'Nashik', 'Palghar', 'Parbhani', 'Pune', 'Raigad', 'Ratnagiri', 'Sangli',
      'Satara', 'Sindhudurg', 'Solapur', 'Thane', 'Wardha', 'Washim', 'Yavatmal'
    ]
  },
  {
    code: 'MN',
    name: 'Manipur',
    type: 'State',
    districts: [
      'Bishnupur', 'Chandel', 'Churachandpur', 'Imphal East', 'Imphal West',
      'Jiribam', 'Kakching', 'Kamjong', 'Kangpokpi', 'Noney', 'Pherzawl',
      'Senapati', 'Tamenglong', 'Tengnoupal', 'Thoubal', 'Ukhrul'
    ]
  },
  {
    code: 'ML',
    name: 'Meghalaya',
    type: 'State',
    districts: [
      'East Garo Hills', 'East Jaintia Hills', 'East Khasi Hills',
      'Eastern West Khasi Hills', 'North Garo Hills', 'Ri Bhoi',
      'South Garo Hills', 'South West Garo Hills', 'South West Khasi Hills',
      'West Garo Hills', 'West Jaintia Hills', 'West Khasi Hills'
    ]
  },
  {
    code: 'MZ',
    name: 'Mizoram',
    type: 'State',
    districts: [
      'Aizawl', 'Champhai', 'Hnahthial', 'Khawzawl', 'Kolasib', 'Lawngtlai',
      'Lunglei', 'Mamit', 'Saitual', 'Serchhip', 'Siaha'
    ]
  },
  {
    code: 'NL',
    name: 'Nagaland',
    type: 'State',
    districts: [
      'Chümoukedima', 'Dimapur', 'Kiphire', 'Kohima', 'Longleng', 'Mokokchung',
      'Mon', 'Niuland', 'Noklak', 'Peren', 'Phek', 'Shamator', 'Tseminyü',
      'Tuensang', 'Wokha', 'Zunheboto'
    ]
  },
  {
    code: 'OD',
    name: 'Odisha',
    type: 'State',
    districts: [
      'Angul', 'Balangir', 'Balasore', 'Bargarh', 'Bhadrak', 'Boudh', 'Cuttack',
      'Deogarh', 'Dhenkanal', 'Gajapati', 'Ganjam', 'Jagatsinghpur', 'Jajpur',
      'Jharsuguda', 'Kalahandi', 'Kandhamal', 'Kendrapara', 'Kendujhar',
      'Khordha', 'Koraput', 'Malkangiri', 'Mayurbhanj', 'Nabarangpur',
      'Nayagarh', 'Nuapada', 'Puri', 'Rayagada', 'Sambalpur', 'Subarnapur', 'Sundargarh'
    ]
  },
  {
    code: 'PB',
    name: 'Punjab',
    type: 'State',
    districts: [
      'Amritsar', 'Barnala', 'Bathinda', 'Faridkot', 'Fatehgarh Sahib',
      'Fazilka', 'Ferozepur', 'Gurdaspur', 'Hoshiarpur', 'Jalandhar',
      'Kapurthala', 'Ludhiana', 'Malerkotla', 'Mansa', 'Moga', 'Pathankot',
      'Patiala', 'Rupnagar', 'Sahibzada Ajit Singh Nagar', 'Sangrur',
      'Shahid Bhagat Singh Nagar', 'Sri Muktsar Sahib', 'Tarn Taran'
    ]
  },
  {
    code: 'RJ',
    name: 'Rajasthan',
    type: 'State',
    districts: [
      'Ajmer', 'Alwar', 'Anupgarh', 'Balotra', 'Banswara', 'Baran', 'Barmer',
      'Beawar', 'Bharatpur', 'Bhilwara', 'Bikaner', 'Bundi', 'Chittorgarh',
      'Churu', 'Dausa', 'Deeg', 'Dholpur', 'Didwana-Kuchaman', 'Dudu',
      'Dungarpur', 'Ganganagar', 'Gangapur City', 'Hanumangarh', 'Jaipur',
      'Jaipur Rural', 'Jaisalmer', 'Jalore', 'Jhalawar', 'Jhunjhunu', 'Jodhpur',
      'Jodhpur Rural', 'Karauli', 'Kekri', 'Khairthal-Tijara', 'Kota',
      'Kotputli-Behror', 'Nagaur', 'Neem Ka Thana', 'Pali', 'Phalodi',
      'Pratapgarh', 'Rajsamand', 'Salumbar', 'Sanchore', 'Sawai Madhopur',
      'Shahpura', 'Sikar', 'Sirohi', 'Tonk', 'Udaipur'
    ]
  },
  {
    code: 'SK',
    name: 'Sikkim',
    type: 'State',
    districts: [
      'Gangtok', 'Gyalshing', 'Mangan', 'Namchi', 'Pakyong', 'Soreng'
    ]
  },
  {
    code: 'TN',
    name: 'Tamil Nadu',
    type: 'State',
    districts: [
      'Ariyalur', 'Chengalpattu', 'Chennai', 'Coimbatore', 'Cuddalore',
      'Dharmapuri', 'Dindigul', 'Erode', 'Kallakurichi', 'Kanchipuram',
      'Kanyakumari', 'Karur', 'Krishnagiri', 'Madurai', 'Mayiladuthurai',
      'Nagapattinam', 'Namakkal', 'Nilgiris', 'Perambalur', 'Pudukkottai',
      'Ramanathapuram', 'Ranipet', 'Salem', 'Sivaganga', 'Tenkasi',
      'Thanjavur', 'Theni', 'Thoothukudi', 'Tiruchirappalli', 'Tirunelveli',
      'Tirupathur', 'Tiruppur', 'Tiruvallur', 'Tiruvannamalai', 'Tiruvarur',
      'Vellore', 'Viluppuram', 'Virudhunagar'
    ]
  },
  {
    code: 'TS',
    name: 'Telangana',
    type: 'State',
    districts: [
      'Adilabad', 'Bhadradri Kothagudem', 'Hanamkonda', 'Hyderabad', 'Jagtial',
      'Jangaon', 'Jayashankar Bhupalpally', 'Jogulamba Gadwal', 'Kamareddy',
      'Karimnagar', 'Khammam', 'Kumuram Bheem Asifabad', 'Mahabubabad',
      'Mahabubnagar', 'Mancherial', 'Medak', 'Medchal-Malkajgiri', 'Mulugu',
      'Nagarkurnool', 'Nalgonda', 'Narayanpet', 'Nirmal', 'Nizamabad',
      'Peddapalli', 'Rajanna Sircilla', 'Ranga Reddy', 'Sangareddy', 'Siddipet',
      'Suryapet', 'Vikarabad', 'Wanaparthy', 'Warangal', 'Yadadri Bhuvanagiri'
    ]
  },
  {
    code: 'TR',
    name: 'Tripura',
    type: 'State',
    districts: [
      'Dhalai', 'Gomati', 'Khowai', 'North Tripura', 'Sepahijala', 'South Tripura',
      'Unakoti', 'West Tripura'
    ]
  },
  {
    code: 'UP',
    name: 'Uttar Pradesh',
    type: 'State',
    districts: [
      'Agra', 'Aligarh', 'Ambedkar Nagar', 'Amethi', 'Amroha', 'Auraiya',
      'Ayodhya', 'Azamgarh', 'Baghpat', 'Bahraich', 'Ballia', 'Balrampur',
      'Banda', 'Barabanki', 'Bareilly', 'Basti', 'Bhadohi', 'Bijnor', 'Budaun',
      'Bulandshahr', 'Chandauli', 'Chitrakoot', 'Deoria', 'Etah', 'Etawah',
      'Farrukhabad', 'Fatehpur', 'Firozabad', 'Gautam Buddha Nagar', 'Ghaziabad',
      'Ghazipur', 'Gonda', 'Gorakhpur', 'Hamirpur', 'Hapur', 'Hardoi',
      'Hathras', 'Jalaun', 'Jaunpur', 'Jhansi', 'Kannauj', 'Kanpur Dehat',
      'Kanpur Nagar', 'Kasganj', 'Kaushambi', 'Kheri', 'Kushinagar', 'Lalitpur',
      'Lucknow', 'Maharajganj', 'Mahoba', 'Mainpuri', 'Mathura', 'Mau',
      'Meerut', 'Mirzapur', 'Moradabad', 'Muzaffarnagar', 'Pilibhit', 'Pratapgarh',
      'Prayagraj', 'Raebareli', 'Rampur', 'Saharanpur', 'Sambhal', 'Sant Kabir Nagar',
      'Shahjahanpur', 'Shamli', 'Shravasti', 'Siddharthnagar', 'Sitapur',
      'Sonbhadra', 'Sultanpur', 'Unnao', 'Varanasi'
    ]
  },
  {
    code: 'UK',
    name: 'Uttarakhand',
    type: 'State',
    districts: [
      'Almora', 'Bageshwar', 'Chamoli', 'Champawat', 'Dehradun', 'Haridwar',
      'Nainital', 'Pauri Garhwal', 'Pithoragarh', 'Rudraprayag', 'Tehri Garhwal',
      'Udham Singh Nagar', 'Uttarkashi'
    ]
  },
  {
    code: 'WB',
    name: 'West Bengal',
    type: 'State',
    districts: [
      'Alipurduar', 'Bankura', 'Birbhum', 'Cooch Behar', 'Dakshin Dinajpur',
      'Darjeeling', 'Hooghly', 'Howrah', 'Jalpaiguri', 'Jhargram', 'Kalimpong',
      'Kolkata', 'Malda', 'Murshidabad', 'Nadia', 'North 24 Parganas',
      'Paschim Bardhaman', 'Paschim Medinipur', 'Purba Bardhaman', 'Purba Medinipur',
      'Purulia', 'South 24 Parganas', 'Uttar Dinajpur'
    ]
  },

  // ── 8 Union Territories ────────────────────────────────────────────────────
  {
    code: 'AN',
    name: 'Andaman and Nicobar Islands',
    type: 'Union Territory',
    districts: [
      'Nicobar', 'North and Middle Andaman', 'South Andaman'
    ]
  },
  {
    code: 'CH',
    name: 'Chandigarh',
    type: 'Union Territory',
    districts: [
      'Chandigarh'
    ]
  },
  {
    code: 'DN',
    name: 'Dadra and Nagar Haveli and Daman and Diu',
    type: 'Union Territory',
    districts: [
      'Dadra and Nagar Haveli', 'Daman', 'Diu'
    ]
  },
  {
    code: 'DL',
    name: 'Delhi',
    type: 'Union Territory',
    districts: [
      'Central Delhi', 'East Delhi', 'New Delhi', 'North Delhi', 'North East Delhi',
      'North West Delhi', 'Shahdara', 'South Delhi', 'South East Delhi',
      'South West Delhi', 'West Delhi'
    ]
  },
  {
    code: 'JK',
    name: 'Jammu and Kashmir',
    type: 'Union Territory',
    districts: [
      'Anantnag', 'Bandipora', 'Baramulla', 'Budgam', 'Doda', 'Ganderbal',
      'Jammu', 'Kathua', 'Kishtwar', 'Kulgam', 'Kupwara', 'Poonch', 'Pulwama',
      'Rajouri', 'Ramban', 'Reasi', 'Samba', 'Shopian', 'Srinagar', 'Udhampur'
    ]
  },
  {
    code: 'LA',
    name: 'Ladakh',
    type: 'Union Territory',
    districts: [
      'Kargil', 'Leh'
    ]
  },
  {
    code: 'LD',
    name: 'Lakshadweep',
    type: 'Union Territory',
    districts: [
      'Lakshadweep'
    ]
  },
  {
    code: 'PY',
    name: 'Puducherry',
    type: 'Union Territory',
    districts: [
      'Karaikal', 'Mahe', 'Puducherry', 'Yanam'
    ]
  }
];

export const getAllStates = () => {
  return INDIA_GEO_MASTER.map((s) => ({
    code: s.code,
    name: s.name,
    type: s.type,
  }));
};

export const getDistrictsForState = (stateIdentifier) => {
  if (!stateIdentifier) return [];
  const query = stateIdentifier.trim().toLowerCase();
  const stateObj = INDIA_GEO_MASTER.find(
    (s) => s.name.toLowerCase() === query || s.code.toLowerCase() === query
  );
  return stateObj ? [...stateObj.districts] : [];
};

export const findState = (stateIdentifier) => {
  if (!stateIdentifier) return null;
  const query = stateIdentifier.trim().toLowerCase();
  return INDIA_GEO_MASTER.find(
    (s) => s.name.toLowerCase() === query || s.code.toLowerCase() === query
  ) || null;
};

export default INDIA_GEO_MASTER;
