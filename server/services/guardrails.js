/**
 * Sobuj Ghonta (সবুজ ঘণ্টা) — Deterministic Safety Guardrails Engine
 * Enforces environmental health constraints that Gemma LLM CANNOT override.
 */

export const MEDICAL_DISCLAIMER_EN =
  'Notice: Sobuj Ghonta provides environmental guidance, not medical advice. Consult healthcare professionals if you have respiratory or cardiovascular conditions.';

export const MEDICAL_DISCLAIMER_BN =
  'সতর্কতা: সবুজ ঘণ্টা পরিবেশগত নির্দেশিকা প্রদান করে, কোনো চিকিৎসাগত পরামর্শ নয়। শ্বাসকষ্ট বা হৃদরোগের সমস্যা থাকলে চিকিৎসকের পরামর্শ নিন।';

/**
 * Evaluates environmental telemetry against deterministic safety thresholds
 */
export function evaluateSafetyGuardrails({
  aqi = 50,
  apparentTemp = 25,
  temp = 25,
  humidity = 60,
  precipProb = 0,
  precip = 0,
  weatherCode = 0,
  windSpeedKmh = 10,
  windSpeed = null,
  hour = 12,
  lat = 23.74,
  dayOfYear = 180
}) {
  const effectiveWindSpeedKmh = windSpeed !== null ? (windSpeed * 3.6) : windSpeedKmh;
  const effectiveTemp = temp !== undefined && temp !== null ? Number(temp) : Number(apparentTemp);

  const flags = {
    unhealthyAqi: aqi > 150,
    hazardousAqi: aqi > 200,
    extremeHeat: apparentTemp >= 38,
    rainThunder: [95, 96, 99].includes(weatherCode) || precip >= 2.0 || precipProb >= 70,
    mosquitoRisk: apparentTemp >= 24 && humidity >= 65 && (precipProb >= 30 || precip > 0),
    middaySun: hour >= 11 && hour <= 15 && apparentTemp >= 34,
    freezing: effectiveTemp <= 0.0,
    windChill: effectiveTemp <= 10 && effectiveWindSpeedKmh >= 20,
    iceOrSnow: [71, 73, 75, 77, 85, 86].includes(weatherCode),
    extremeWind: effectiveWindSpeedKmh >= 60,
    polarConditions: Math.abs(lat) >= 66.5
  };

  const requiredHealthNotesEn = [];
  const requiredHealthNotesBn = [];

  // Rule 1: Hazardous AQI (>200)
  if (flags.hazardousAqi) {
    requiredHealthNotesEn.push(
      `Severe air hazard (AQI ${aqi}): Outdoor exercise is unsafe. Postpone your walk or stay indoors. If going outside, wear a certified well-fitted N95 mask.`
    );
    requiredHealthNotesBn.push(
      `বাতাসের বিপজ্জনক অবস্থা (AQI ${aqi}): বাইরে শরীরচর্চা ঝুঁকিপূর্ণ। হাঁটা পিছিয়ে দিন বা ঘরে থাকুন। বাইরে বের হলে অবশ্যই N95 মাস্ক ব্যবহার করুন।`
    );
  }
  // Rule 2: Unhealthy AQI (>150 and <=200)
  else if (flags.unhealthyAqi) {
    requiredHealthNotesEn.push(
      `Poor air quality (AQI ${aqi}): Strenuous cardio is not advised. Restrict activity to a short gentle stroll or balcony/rooftop plant observation.`
    );
    requiredHealthNotesBn.push(
      `অস্বাস্থ্যকর বাতাস (AQI ${aqi}): দ্রুত হাঁটা বা দৌড়ানো অনুচিত। স্বল্প সময়ের ধীর হাঁটা অথবা বারান্দা/ছাদে গাছপালার সান্নিধ্যে সময় কাটান।`
    );
  }

  // Rule 3: Extreme Heat (>=38°C)
  if (flags.extremeHeat) {
    requiredHealthNotesEn.push(
      `Extreme thermal stress (${Math.round(apparentTemp)}°C heat index): Strictly avoid midday sun. Hydrate before stepping out and seek dense tree canopy.`
    );
    requiredHealthNotesBn.push(
      `চরম দাবদাহ (অনুভূত তাপমাত্রা ${Math.round(apparentTemp)}°C): দুপুরের রোদ সম্পূর্ণ এড়িয়ে চলুন। পর্যাপ্ত পানি পান করুন এবং ছায়াযুক্ত স্থানে থাকুন।`
    );
  }

  // Rule 4: Thunderstorm / Heavy Rain
  if (flags.rainThunder) {
    requiredHealthNotesEn.push(
      'Thunderstorm/heavy rain warning: Reschedule outdoor trail activity until storm passes. Avoid standing near open water or tall solitary trees.'
    );
    requiredHealthNotesBn.push(
      'বজ্রপাত ও ভারী বৃষ্টির সতর্কতা: ঝড় না থামা পর্যন্ত বাইরে যাওয়া স্থগিত রাখুন। উন্মুক্ত জলাশয় বা বড় গাছের নিচে আশ্রয় নেবেন না।'
    );
  }

  // Rule 5: Mosquito Risk (warm, humid, post-rain)
  if (flags.mosquitoRisk) {
    requiredHealthNotesEn.push(
      'Mosquito breeding conditions: Apply insect repellent and wear long sleeves to guard against urban vector-borne risks (e.g. Dengue).'
    );
    requiredHealthNotesBn.push(
      'মশার উপদ্রবের ঝুঁকি: ডেঙ্গু প্রতিরোধে মশা তাড়ানোর লোশন ব্যবহার করুন এবং ফুলহাতা পোশাক পরিধান করুন।'
    );
  }

  // Rule 6: Freezing Temperatures (<= 0°C)
  if (flags.freezing) {
    requiredHealthNotesEn.push(
      `Freezing hazard (${Math.round(effectiveTemp)}°C): Sub-zero cold increases hypothermia risk. Wear thermal layers, gloves, and limit exposure to short bursts.`
    );
    requiredHealthNotesBn.push(
      `হিমাঙ্কের সতর্কতা (${Math.round(effectiveTemp)}°C): প্রচণ্ড ঠান্ডায় শরীর দ্রুত তাপ হারায়। পর্যাপ্ত শীতবস্ত্র পরিধান করুন এবং হাঁটার সময় সীমিত রাখুন।`
    );
  }

  // Rule 7: Wind Chill (temp <= 10°C and wind >= 20 km/h)
  if (flags.windChill) {
    requiredHealthNotesEn.push(
      `Wind chill advisory (${Math.round(effectiveWindSpeedKmh)} km/h winds): Cold gusts accelerate body cooling. Protect extremities and seek sheltered paths.`
    );
    requiredHealthNotesBn.push(
      `কনকনে বাতাসের সতর্কতা (ঘণ্টায় ${Math.round(effectiveWindSpeedKmh)} কিমি বাতাস): ঠান্ডা বাতাসে দ্রুত শীত অনুভূত হয়। কান ও হাত ঢেকে রাখুন।`
    );
  }

  // Rule 8: Ice and Snow Conditions (codes 71, 73, 75, 77, 85, 86)
  if (flags.iceOrSnow) {
    requiredHealthNotesEn.push(
      'Ice and snow condition: Walkways may be slick and icy. Shorten your stride, step carefully on paved slopes, and wear traction footwear.'
    );
    requiredHealthNotesBn.push(
      'তুষার ও বরফের সতর্কতা: হাঁটার পথ পিচ্ছিল হতে পারে। সাবধানে ও ছোট পদক্ষেপে চলুন এবং পিচ্ছিলরোধী জুতো ব্যবহার করুন।'
    );
  }

  // Rule 9: Extreme Hurricane / Gale Winds (>= 60 km/h)
  if (flags.extremeWind) {
    requiredHealthNotesEn.push(
      `Extreme high wind warning (${Math.round(effectiveWindSpeedKmh)} km/h): Risk of falling tree branches and debris. Stay away from mature canopies.`
    );
    requiredHealthNotesBn.push(
      `ঝড়ো বাতাসের সতর্কতা (ঘণ্টায় ${Math.round(effectiveWindSpeedKmh)} কিমি বাতাস): গাছের ডালপালা ভেঙে পড়ার ঝুঁকি। বড় গাছের নিচে যাবেন না।`
    );
  }

  // Mandatory Medical Disclaimer
  requiredHealthNotesEn.push(MEDICAL_DISCLAIMER_EN);
  requiredHealthNotesBn.push(MEDICAL_DISCLAIMER_BN);

  let maxAllowedEffort = 'moderate';
  if (flags.hazardousAqi) {
    maxAllowedEffort = 'rest';
  } else if (flags.unhealthyAqi || flags.freezing || flags.iceOrSnow) {
    maxAllowedEffort = 'gentle';
  }

  return {
    flags,
    maxAllowedEffort,
    requiredHealthNotesEn,
    requiredHealthNotesBn
  };
}

/**
 * Calculates polar day/night solar intervals without NaN values.
 * Handles latitudes near poles (|lat| >= 66.5°).
 */
export function getPolarDaylight(lat, dayOfYear = 180) {
  const absLat = Math.abs(lat);
  if (absLat >= 66.5) {
    // Hemisphere-aware summer/winter solstice
    const isNorthern = lat > 0;
    const isSummerSolsticeWindow = dayOfYear >= 80 && dayOfYear <= 264; // ~March 21 to Sept 22
    const isPolarDay = isNorthern ? isSummerSolsticeWindow : !isSummerSolsticeWindow;
    return {
      isPolarDay,
      isPolarNight: !isPolarDay,
      daylightHours: isPolarDay ? 24 : 0,
      hasSunset: false
    };
  }

  return {
    isPolarDay: false,
    isPolarNight: false,
    daylightHours: 12,
    hasSunset: true
  };
}

/**
 * Validates and corrects Gemma's returned JSON plan against deterministic rules.
 * This ensures the LLM can never violate safety requirements.
 */
export function validateAndCorrectPlan(plan, guardrails, language = 'en') {
  if (!plan || typeof plan !== 'object') {
    throw new Error('Invalid plan payload: expected object');
  }

  const corrected = { ...plan };
  const notes = Array.isArray(corrected.health_notes) ? [...corrected.health_notes] : [];

  // 1. Force effort level constraint
  const effort = String(corrected.effort_level || 'gentle').toLowerCase();
  if (guardrails.flags.hazardousAqi) {
    corrected.effort_level = 'rest';
  } else if (guardrails.flags.unhealthyAqi && (effort === 'strenuous' || effort === 'moderate')) {
    corrected.effort_level = 'gentle';
  }

  // 2. Ensure all required health notes exist in the plan
  const requiredNotes = language === 'bn' ? guardrails.requiredHealthNotesBn : guardrails.requiredHealthNotesEn;
  for (const requiredNote of requiredNotes) {
    const alreadyPresent = notes.some(
      n => n && (n.includes(requiredNote.slice(0, 20)) || requiredNote.includes(n.slice(0, 20)))
    );
    if (!alreadyPresent) {
      notes.push(requiredNote);
    }
  }
  corrected.health_notes = notes;

  // 3. Ensure destination and window exist
  if (!corrected.destination_id) {
    corrected.destination_id = 'default_green_space';
  }
  if (!corrected.window || typeof corrected.window !== 'object') {
    corrected.window = {
      start: '16:30',
      end: '17:30',
      why: language === 'bn' ? 'অনুকূল সবুজ ঘণ্টা' : 'Optimal green window'
    };
  }

  // 4. Validate missions (must be array of 3 items with valid sensory types)
  const validMissions = ['look', 'listen', 'touch', 'smell'];
  if (!Array.isArray(corrected.missions) || corrected.missions.length < 3) {
    corrected.missions = [
      {
        type: 'look',
        prompt: language === 'bn' ? 'গাছের পাতায় আলোর খেলা লক্ষ্য করুন।' : 'Notice the pattern of sunlight through tree leaves.'
      },
      {
        type: 'listen',
        prompt: language === 'bn' ? 'শহরের কোলাহলের মাঝে পাখির ডাক শুনুন।' : 'Listen for bird calls amidst ambient city hum.'
      },
      {
        type: 'touch',
        prompt: language === 'bn' ? 'একটি শুকনো পাতা বা গাছের বাকল স্পর্শ করুন।' : 'Gently touch the rough texture of tree bark.'
      }
    ];
  } else {
    // Sanitize mission types
    corrected.missions = corrected.missions.slice(0, 3).map((m, idx) => ({
      type: validMissions.includes(m.type) ? m.type : validMissions[idx % validMissions.length],
      prompt: String(m.prompt || '').trim() || (language === 'bn' ? 'প্রকৃতির দিকে মনোনিবেশ করুন।' : 'Observe nature around you.')
    }));
  }

  // 5. Validate walk_script (must be 4-6 segments, <=60 words each)
  if (!Array.isArray(corrected.walk_script) || corrected.walk_script.length < 3) {
    corrected.walk_script = [
      {
        title: language === 'bn' ? 'শুরুর পদক্ষেপ' : 'Stepping Out',
        text: language === 'bn' ? 'ফোনটি পকেটে রাখুন। গভীর শ্বাস নিন এবং চারপাশের খোলা বাতাসের স্পর্শ অনুভব করুন।' : 'Stow your phone in your pocket. Take a deep breath and feel the open air around you.'
      },
      {
        title: language === 'bn' ? 'সবুজের দিকে যাত্রা' : 'Walking toward Greenery',
        text: language === 'bn' ? 'সহজ পদক্ষেপে এগিয়ে যান। রাস্তার ধারের ঘাস বা গাছের রঙ লক্ষ্য করুন।' : 'Maintain a steady, relaxed stride. Look up toward tree canopies overhead.'
      },
      {
        title: language === 'bn' ? 'প্রকৃতিতে স্থিরতা' : 'Mindful Pause',
        text: language === 'bn' ? 'এক মুহূর্ত দাঁড়ান। মাটির ঘ্রাণ নিন এবং চোখ বন্ধ করে বাতাসের শব্দ শুনুন।' : 'Pause under a tree. Close your eyes and listen to leaves rustling in the breeze.'
      },
      {
        title: language === 'bn' ? 'ফেরার পথ' : 'Return Refreshed',
        text: language === 'bn' ? 'ধীরে ধীরে ফেরার পথ ধরুন। এই প্রশান্তিটুকু নিজের সাথে ধরে রাখুন।' : 'Head gently on your return path, carrying this calm clarity with you.'
      }
    ];
  } else {
    corrected.walk_script = corrected.walk_script.slice(0, 6).map((seg, i) => {
      let text = String(seg.text || '').trim();
      const words = text.split(/\s+/);
      if (words.length > 65) {
        text = words.slice(0, 60).join(' ') + '...';
      }
      return {
        title: String(seg.title || `Segment ${i + 1}`).trim(),
        text
      };
    });
  }

  return corrected;
}
