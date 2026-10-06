/**
 * Sobuj Ghonta (সবুজ ঘণ্টা) — Deterministic Green Window Scoring Engine
 * Computes an objective 0–100 hourly score for outdoor nature engagement.
 */

export function calculateHourlyGreenWindowScore({
  aqi = 50,
  pm25 = 15,
  apparentTemp = 25,
  uv = 2,
  precipProb = 0,
  precip = 0,
  weatherCode = 0,
  isDaylight = true,
  isGoldenHour = false
}) {
  let score = 100;
  const penalties = {};
  const bonuses = {};
  const reasonsEn = [];
  const reasonsBn = [];

  // 1. Air Quality Penalty (US AQI)
  let aqiPenalty = 0;
  if (aqi <= 50) {
    aqiPenalty = 0;
  } else if (aqi <= 100) {
    aqiPenalty = (aqi - 50) * 0.3; // 0 to 15
    reasonsEn.push(`Moderate air quality (AQI ${aqi})`);
    reasonsBn.push(`মধ্যম বাতাসের মান (AQI ${aqi})`);
  } else if (aqi <= 150) {
    aqiPenalty = 15 + (aqi - 100) * 0.4; // 15 to 35
    reasonsEn.push(`Air unhealthy for sensitive groups (AQI ${aqi})`);
    reasonsBn.push(`সংবেদনশীল ব্যক্তিদের জন্য অস্বাস্থ্যকর বাতাস (AQI ${aqi})`);
  } else if (aqi <= 200) {
    aqiPenalty = 35 + (aqi - 150) * 0.5; // 35 to 60
    reasonsEn.push(`Unhealthy air quality (AQI ${aqi})`);
    reasonsBn.push(`অস্বাস্থ্যকর বাতাসের মান (AQI ${aqi})`);
  } else if (aqi <= 300) {
    aqiPenalty = 60 + (aqi - 200) * 0.25; // 60 to 85
    reasonsEn.push(`Very unhealthy air (AQI ${aqi})`);
    reasonsBn.push(`খুবই অস্বাস্থ্যকর বাতাস (AQI ${aqi})`);
  } else {
    aqiPenalty = 90;
    reasonsEn.push(`Hazardous air quality (AQI ${aqi})`);
    reasonsBn.push(`বিপজ্জনক বাতাসের মান (AQI ${aqi})`);
  }
  penalties.aqi = Math.round(aqiPenalty);
  score -= aqiPenalty;

  // 2. Thermal Comfort (Apparent Temperature in °C)
  let heatPenalty = 0;
  if (apparentTemp > 28) {
    if (apparentTemp <= 33) {
      heatPenalty = (apparentTemp - 28) * 3; // 0 to 15
      reasonsEn.push(`Warm conditions (${Math.round(apparentTemp)}°C feels like)`);
      reasonsBn.push(`উষ্ণ আবহাওয়া (অনুভূত তাপমাত্রা ${Math.round(apparentTemp)}°C)`);
    } else if (apparentTemp <= 38) {
      heatPenalty = 15 + (apparentTemp - 33) * 4; // 15 to 35
      reasonsEn.push(`High heat index (${Math.round(apparentTemp)}°C feels like)`);
      reasonsBn.push(`উচ্চ তাপমাত্রার অস্বস্তি (অনুভূত তাপমাত্রা ${Math.round(apparentTemp)}°C)`);
    } else {
      heatPenalty = 35 + Math.min(25, (apparentTemp - 38) * 5); // 35 to 60
      reasonsEn.push(`Extreme dangerous heat (${Math.round(apparentTemp)}°C feels like)`);
      reasonsBn.push(`চরম তাপপ্রবাহ (অনুভূত তাপমাত্রা ${Math.round(apparentTemp)}°C)`);
    }
  } else if (apparentTemp < 16) {
    if (apparentTemp >= 10) {
      heatPenalty = (16 - apparentTemp) * 2; // 0 to 12
      reasonsEn.push(`Cool weather (${Math.round(apparentTemp)}°C feels like)`);
      reasonsBn.push(`শীতল আবহাওয়া (অনুভূত তাপমাত্রা ${Math.round(apparentTemp)}°C)`);
    } else {
      heatPenalty = 12 + (10 - apparentTemp) * 3; // 12 to 30
      reasonsEn.push(`Chilly conditions (${Math.round(apparentTemp)}°C feels like)`);
      reasonsBn.push(`তীব্র শীত (অনুভূত তাপমাত্রা ${Math.round(apparentTemp)}°C)`);
    }
  }
  penalties.temperature = Math.round(heatPenalty);
  score -= heatPenalty;

  // 3. Solar Radiation (UV Index)
  let uvPenalty = 0;
  if (uv >= 3 && uv <= 5) {
    uvPenalty = 5;
  } else if (uv >= 6 && uv <= 7) {
    uvPenalty = 12;
    reasonsEn.push(`High UV radiation (UV ${uv})`);
    reasonsBn.push(`তীব্র ক্ষতিকর রোদ (UV ${uv})`);
  } else if (uv >= 8 && uv <= 10) {
    uvPenalty = 20;
    reasonsEn.push(`Very high UV index (UV ${uv})`);
    reasonsBn.push(`অতিরিক্ত ক্ষতিকর অতিবেগুনি রশ্মি (UV ${uv})`);
  } else if (uv >= 11) {
    uvPenalty = 30;
    reasonsEn.push(`Extreme UV hazard (UV ${uv})`);
    reasonsBn.push(`চরম ঝুঁকিপূর্ণ UV ইনডেক্স (UV ${uv})`);
  }
  penalties.uv = Math.round(uvPenalty);
  score -= uvPenalty;

  // 4. Precipitation & Storms
  let rainPenalty = 0;
  const isThunder = [95, 96, 99].includes(weatherCode);
  if (isThunder) {
    rainPenalty = 55;
    reasonsEn.push('Thunderstorm alert');
    reasonsBn.push('বজ্রঝড়ের আশঙ্কা');
  } else if (precip >= 2.0 || precipProb >= 75) {
    rainPenalty = 40;
    reasonsEn.push('Heavy rain probability');
    reasonsBn.push('ভারী বৃষ্টির সম্ভাবনা');
  } else if (precip >= 0.5 || precipProb >= 50) {
    rainPenalty = 25;
    reasonsEn.push('Moderate rain chance');
    reasonsBn.push('বৃষ্টির সম্ভাবনা');
  } else if (precipProb >= 25) {
    rainPenalty = 10;
    reasonsEn.push('Slight chance of rain');
    reasonsBn.push('হালকা বৃষ্টির সম্ভাবনা');
  }
  penalties.precipitation = Math.round(rainPenalty);
  score -= rainPenalty;

  // 5. Daylight & Nighttime
  let darknessPenalty = 0;
  if (!isDaylight) {
    darknessPenalty = 25;
    reasonsEn.push('Nighttime / after sunset');
    reasonsBn.push('রাত / সূর্যাস্তের পর');
  }
  penalties.darkness = darknessPenalty;
  score -= darknessPenalty;

  // 6. Golden Hour Bonus
  let goldenHourBonus = 0;
  if (isGoldenHour && isDaylight && rainPenalty <= 10 && aqi <= 150) {
    goldenHourBonus = 12;
    bonuses.goldenHour = goldenHourBonus;
    score += goldenHourBonus;
    reasonsEn.push('Golden hour lighting & gentle temperatures');
    reasonsBn.push('মনোরম গোধূলির আলো ও স্নিগ্ধ পরিবেশ');
  }

  // Final normalization to [0, 100]
  const finalScore = Math.max(0, Math.min(100, Math.round(score)));

  let category = 'hazardous';
  let categoryBn = 'ঝুঁকিপূর্ণ';
  if (finalScore >= 80) {
    category = 'optimal';
    categoryBn = 'অনুকূল';
  } else if (finalScore >= 65) {
    category = 'good';
    categoryBn = 'ভালো';
  } else if (finalScore >= 45) {
    category = 'fair';
    categoryBn = 'সহনীয়';
  } else if (finalScore >= 25) {
    category = 'poor';
    categoryBn = 'খারাপ';
  }

  return {
    score: finalScore,
    category,
    categoryBn,
    penalties,
    bonuses,
    reasonsEn,
    reasonsBn
  };
}

/**
 * Score 24 hours of forecast data and identify the optimal Green Window
 */
export function scoreForecastTimeline(hourlyData, dailyData = {}) {
  const sunrise = dailyData.sunrise?.[0] ? new Date(dailyData.sunrise[0]) : null;
  const sunset = dailyData.sunset?.[0] ? new Date(dailyData.sunset[0]) : null;

  const timeline = hourlyData.time.map((timeStr, idx) => {
    const time = new Date(timeStr);
    const hour = timeStr.includes('T')
      ? parseInt(timeStr.split('T')[1].slice(0, 2), 10)
      : time.getHours();

    let isDaylight = true;
    let isGoldenHour = false;

    if (sunrise && sunset) {
      isDaylight = time >= sunrise && time <= sunset;
      // Golden hour: 1 hour after sunrise or 1 hour before sunset
      const diffSunrise = Math.abs(time - sunrise) / (1000 * 60 * 60);
      const diffSunset = Math.abs(time - sunset) / (1000 * 60 * 60);
      isGoldenHour = diffSunrise <= 1 || diffSunset <= 1;
    } else {
      // Fallback daylight approximation: 6 AM to 6 PM
      isDaylight = hour >= 6 && hour <= 18;
      isGoldenHour = hour === 6 || hour === 7 || hour === 17 || hour === 18;
    }

    const aqi = hourlyData.us_aqi?.[idx] ?? 50;
    const pm25 = hourlyData.pm2_5?.[idx] ?? 15;
    const apparentTemp = hourlyData.apparent_temperature?.[idx] ?? hourlyData.temperature_2m?.[idx] ?? 25;
    const uv = hourlyData.uv_index?.[idx] ?? 0;
    const precipProb = hourlyData.precipitation_probability?.[idx] ?? 0;
    const precip = hourlyData.precipitation?.[idx] ?? 0;
    const weatherCode = hourlyData.weather_code?.[idx] ?? 0;

    const evaluation = calculateHourlyGreenWindowScore({
      aqi,
      pm25,
      apparentTemp,
      uv,
      precipProb,
      precip,
      weatherCode,
      isDaylight,
      isGoldenHour
    });

    return {
      time: timeStr,
      hour,
      aqi,
      pm25,
      apparentTemp,
      uv,
      precipProb,
      precip,
      weatherCode,
      isDaylight,
      isGoldenHour,
      ...evaluation
    };
  });

  // Find the single best window (e.g. consecutive hours with peak scores)
  let bestWindow = null;
  let maxScore = -1;

  for (let i = 0; i < timeline.length; i++) {
    if (timeline[i].score > maxScore) {
      maxScore = timeline[i].score;
      bestWindow = {
        start: timeline[i].time,
        end: timeline[Math.min(timeline.length - 1, i + 1)].time,
        hour: timeline[i].hour,
        score: timeline[i].score,
        category: timeline[i].category,
        categoryBn: timeline[i].categoryBn,
        reasonsEn: timeline[i].reasonsEn,
        reasonsBn: timeline[i].reasonsBn
      };
    }
  }

  return {
    timeline,
    bestWindow
  };
}
