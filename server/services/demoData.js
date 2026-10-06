/**
 * Bundled Dhaka Demo Dataset for Zero-Latency, Zero-Key Evaluation
 * Coordinates: 23.7388° N, 90.3995° E (Central Dhaka / Ramna)
 */

export const DHAKA_COORDINATES = {
  lat: 23.7388,
  lon: 90.3995,
  name: 'Dhaka',
  nameBn: 'ঢাকা',
  country: 'Bangladesh'
};

export const DHAKA_PARKS = [
  {
    id: 'ramna_park',
    name: 'Ramna Park',
    nameBn: 'রমনা পার্ক',
    type: 'park',
    lat: 23.7388,
    lon: 90.3995,
    distanceMeters: 450,
    walkTimeMinutes: 6,
    description: '68-acre historic botanical sanctuary featuring centuries-old banyan, mahogany, and rain trees surrounding a tranquil lake.',
    descriptionBn: 'শতবর্ষী বট, মেহগনি ও রেইনট্রি সমৃদ্ধ ৬৮ একরের ঐতিহাসিক উদ্যান এবং নির্মল লেক।'
  },
  {
    id: 'suhrawardy_udyan',
    name: 'Suhrawardy Udyan',
    nameBn: 'সোহরাওয়ার্দী উদ্যান',
    type: 'park',
    lat: 23.7335,
    lon: 90.3975,
    distanceMeters: 850,
    walkTimeMinutes: 11,
    description: 'Expansive historic park with open green lawns, wide paved walkways, and shaded seating beneath neem and eucalyptus trees.',
    descriptionBn: 'বিশাল সবুজ প্রান্তর, প্রশস্ত হাঁটার পথ এবং নিম ও ইউক্যালিপটাস গাছের স্নিগ্ধ ছায়া।'
  },
  {
    id: 'dhanmondi_lake',
    name: 'Dhanmondi Lake Park',
    nameBn: 'ধানমন্ডি লেক পার্ক',
    type: 'lakeside',
    lat: 23.7465,
    lon: 90.3755,
    distanceMeters: 1800,
    walkTimeMinutes: 24,
    description: 'Winding waterfront promenade around Dhanmondi Lake, shaded by weeping willows, bokul blossoms, and lotus ponds.',
    descriptionBn: 'লেকের পাড় ঘেঁষে আঁকাবাঁকা হাঁটার পথ, বকুল ফুলের সৌরভ এবং পদ্মপুকুরের শান্ত পরিবেশ।'
  },
  {
    id: 'chandrima_udyan',
    name: 'Chandrima Udyan',
    nameBn: 'চন্দ্রিমা উদ্যান',
    type: 'park',
    lat: 23.7665,
    lon: 90.3800,
    distanceMeters: 2600,
    walkTimeMinutes: 35,
    description: 'Crescent-shaped lake gardens adjacent to the National Parliament with arched bridges and quiet tree-lined promenades.',
    descriptionBn: 'জাতীয় সংসদ ভবনের পাশে অর্ধচন্দ্রাকৃতির লেক, খিলানযুক্ত সেতু এবং শান্ত মনোরম বৃক্ষছায়া।'
  },
  {
    id: 'gulshan_lake_park',
    name: 'Gulshan Lake Park',
    nameBn: 'গুলশান লেক পার্ক',
    type: 'nature_reserve',
    lat: 23.7915,
    lon: 90.4140,
    distanceMeters: 3100,
    walkTimeMinutes: 42,
    description: 'Dense urban micro-forest along Gulshan Lake with shaded jogging tracks, bamboo groves, and native bird nesting grounds.',
    descriptionBn: 'গুলশান লেক সংলগ্ন নিবিড় সবুজ উদ্যান, বাঁশঝাড় এবং দেশীয় পাখির কলকাকলিতে মুখরিত প্রাঙ্গণ।'
  }
];

export const DHAKA_SAMPLE_WEATHER = {
  current: {
    time: '2026-10-07T16:30',
    temperature: 28.5,
    apparentTemp: 31.0,
    aqi: 72,
    pm25: 22.1,
    uv: 1.2,
    humidity: 71,
    precipProb: 10,
    precip: 0.0,
    weatherCode: 1, // Mainly clear
    weatherDesc: 'Mainly clear and mild',
    weatherDescBn: 'পরিষ্কার আকাশ ও মনোরম আবহাওয়া'
  },
  daily: {
    sunrise: ['2026-10-07T05:52'],
    sunset: ['2026-10-07T17:41']
  },
  hourly: {
    time: [
      '2026-10-07T06:00', '2026-10-07T07:00', '2026-10-07T08:00', '2026-10-07T09:00',
      '2026-10-07T10:00', '2026-10-07T11:00', '2026-10-07T12:00', '2026-10-07T13:00',
      '2026-10-07T14:00', '2026-10-07T15:00', '2026-10-07T16:00', '2026-10-07T17:00',
      '2026-10-07T18:00', '2026-10-07T19:00', '2026-10-07T20:00', '2026-10-07T21:00',
      '2026-10-07T22:00', '2026-10-07T23:00', '2026-10-08T00:00', '2026-10-08T01:00',
      '2026-10-08T02:00', '2026-10-08T03:00', '2026-10-08T04:00', '2026-10-08T05:00'
    ],
    temperature_2m: [
      24, 25, 27, 29, 31, 32, 33, 33, 32, 31, 29, 28, 27, 26, 26, 25, 25, 24, 24, 24, 23, 23, 23, 23
    ],
    apparent_temperature: [
      25, 26, 29, 32, 34, 36, 37, 37, 36, 34, 32, 30, 29, 28, 28, 27, 27, 26, 26, 25, 25, 24, 24, 24
    ],
    us_aqi: [
      110, 115, 120, 105, 95, 88, 80, 75, 70, 68, 65, 62, 78, 92, 108, 125, 138, 145, 152, 155, 150, 142, 130, 118
    ],
    pm2_5: [
      38, 41, 44, 36, 32, 29, 26, 24, 21, 20, 19, 18, 25, 31, 38, 46, 52, 56, 60, 62, 59, 54, 48, 42
    ],
    uv_index: [
      0, 1, 2, 4, 6, 8, 9, 8, 6, 4, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
    ],
    precipitation_probability: [
      5, 5, 5, 5, 10, 10, 15, 15, 10, 10, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5
    ],
    precipitation: [
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
    ],
    weather_code: [
      1, 1, 1, 1, 1, 1, 2, 2, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
    ]
  }
};

export const DHAKA_PREGENERATED_PLAN_EN = {
  headline: 'Golden Hour Respite at Ramna Park',
  window: {
    start: '16:30',
    end: '17:30',
    why: 'Optimal green window: air quality settles into moderate (AQI 62), UV drops to near zero, and the golden hour sun casts cool shadows across the lake.'
  },
  destination_id: 'ramna_park',
  destination_name: 'Ramna Park',
  effort_level: 'gentle',
  health_notes: [
    'Moderate air quality (AQI 62): suitable for gentle walking and slow mindful breathing.',
    'Warm evening with humidity above 70%: apply mosquito repellent on exposed skin (vector-borne protection).',
    'Stay hydrated: carry a small bottle of drinking water.',
    'Notice: Sobuj Ghonta provides environmental guidance, not medical advice. Consult healthcare professionals if you have respiratory or cardiovascular conditions.'
  ],
  missions: [
    {
      type: 'look',
      prompt: 'Notice how the late afternoon sun filters through the broad leaves of ancient mahogany and rain trees.'
    },
    {
      type: 'listen',
      prompt: 'Tune out the Shahbag traffic hum; listen for the distinct whistling calls of Asian Koels roosting near the water.'
    },
    {
      type: 'touch',
      prompt: 'Pause beside an aged banyan trunk and run your palm over the coarse texture of its descending aerial roots.'
    }
  ],
  walk_script: [
    {
      title: 'Stepping Into the Sanctuary',
      text: 'Stow your phone in your pocket. As you cross the park gate, take one long, deliberate breath. Let the drone of the city fade behind the rustle of leaves.'
    },
    {
      title: 'Under the Ancient Canopy',
      text: 'Follow the dirt path under the sweeping banyan branches. Notice the drop in radiant pavement heat as the cool canopy envelops you. Walk without rush.'
    },
    {
      title: 'Lake Promenade Mindfulness',
      text: 'Approach the quiet water of Ramna Lake. Watch the golden sunlight ripple across the surface. Let your eyes soften and take in the horizontal greenery.'
    },
    {
      title: 'Grounding and Return',
      text: 'Pause under the mahogany grove for two silent minutes. Feel your feet solid against the earth. Return refreshed, keeping this stillness with you.'
    }
  ]
};

export const DHAKA_PREGENERATED_PLAN_BN = {
  headline: 'রমনা পার্কে গোধূলির সবুজ অবকাশ',
  window: {
    start: '১৬:৩০',
    end: '১৭:৩০',
    why: 'অনুকূল সবুজ ঘণ্টা: বাতাসের মান সহনীয় (AQI ৬২), ক্ষতিকর রোদ নেই এবং হ্রদের জলে গোধূলির শান্ত স্নিগ্ধ আভা ছড়াচ্ছে।'
  },
  destination_id: 'ramna_park',
  destination_name: 'রমনা পার্ক',
  effort_level: 'gentle',
  health_notes: [
    'বাতাসের মান সহনীয় (AQI ৬২): ধীর পদচারণা ও নির্মল পরিবেশে শ্বাস নেওয়ার জন্য উপযোগী।',
    'উষ্ণ ও আর্দ্র সন্ধ্যা: ডেঙ্গু প্রতিরোধে উন্মুক্ত স্থানে মশা তাড়ানোর লোশন ব্যবহার করুন।',
    'হাঁটার আগে পানি পান করে নিজেকে সতেজ রাখুন।',
    'সতর্কতা: সবুজ ঘণ্টা পরিবেশগত নির্দেশিকা প্রদান করে, কোনো চিকিৎসাগত পরামর্শ নয়। শ্বাসকষ্ট বা হৃদরোগের সমস্যা থাকলে চিকিৎসকের পরামর্শ নিন।'
  ],
  missions: [
    {
      type: 'look',
      prompt: 'মেহগনি ও রেইনট্রি পাতার ফাঁক দিয়ে শেষ বিকেলের সোনালী আলোর রশ্মি কীভাবে মাটিতে পড়েছে তা লক্ষ্য করুন।'
    },
    {
      type: 'listen',
      prompt: 'শাহবাগের গাড়ির হর্ন ছাপিয়ে গাছের ডালে কোকিল ও দোয়েল পাখির মিষ্টি কলতান শোনার চেষ্টা করুন।'
    },
    {
      type: 'touch',
      prompt: 'একটি প্রাচীন বটগাছের পাশে দাঁড়িয়ে তার ঝুরিমূলের খসখসে প্রাকৃতিক স্পর্শ আঙুল দিয়ে অনুভব করুন।'
    }
  ],
  walk_script: [
    {
      title: 'সবুজে প্রথম পদক্ষেপ',
      text: 'ফোনটি পকেটে রেখে দিন। পার্কের প্রবেশপথে দাঁড়িয়ে একটি গভীর শ্বাস নিন। পেছনের যান্ত্রিক কোলাহল ভুলে পাতার মর্মর ধ্বনিতে কান পাতুন।'
    },
    {
      title: 'শতবর্ষী বৃক্ষের ছায়াতলে',
      text: 'মাটির পথ ধরে প্রাচীন বটবৃক্ষের তলা দিয়ে হেঁটে যান। পিচঢালা রাস্তার উত্তাপ ছেড়ে এই বৃক্ষছায়ার স্নিগ্ধ শীতলতা আপনার ত্বকে অনুভব করুন।'
    },
    {
      title: 'লেক পাড়ের ধ্যানমগ্নতা',
      text: 'রমনা লেকের শান্ত জলের কিনারায় এগিয়ে যান। জলের ঢেউয়ে অস্তগামী সূর্যের সোনালী প্রতিফলন দেখুন। চোখ দুটো শিথিল করে সবুজ দিগন্তে তাকান।'
    },
    {
      title: 'প্রশান্তি নিয়ে প্রত্যাবর্তন',
      text: 'মেহগনি গাছের নিচে দুই মিনিট স্থির হয়ে দাঁড়ান। মাটির স্পর্শে নিজের শরীরকে স্থির করুন। এই নির্মল অনুভূতি সাথে নিয়ে ফেরার পথ ধরুন।'
    }
  ]
};
