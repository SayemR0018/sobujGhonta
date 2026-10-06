import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { calculateHourlyGreenWindowScore, scoreForecastTimeline } from '../services/scoring.js';

describe('Green Window Scoring Engine', () => {
  test('Optimal weather with golden hour produces top-tier score', () => {
    const result = calculateHourlyGreenWindowScore({
      aqi: 25,
      apparentTemp: 24,
      uv: 1,
      precipProb: 5,
      precip: 0,
      weatherCode: 0,
      isDaylight: true,
      isGoldenHour: true
    });

    assert.equal(result.score >= 90, true, `Expected >= 90, got ${result.score}`);
    assert.equal(result.category, 'optimal');
    assert.equal(result.bonuses.goldenHour, 12);
  });

  test('Severe air pollution (AQI 220) severely penalizes score', () => {
    const result = calculateHourlyGreenWindowScore({
      aqi: 220,
      apparentTemp: 24,
      uv: 2,
      precipProb: 0,
      isDaylight: true
    });

    assert.equal(result.score <= 45, true, `Expected <= 45, got ${result.score}`);
    assert.equal(result.penalties.aqi >= 65, true);
    assert.equal(result.reasonsEn.some(r => r.includes('Very unhealthy')), true);
  });

  test('Extreme heat (>38°C) applies dangerous thermal penalty', () => {
    const result = calculateHourlyGreenWindowScore({
      aqi: 40,
      apparentTemp: 41,
      uv: 7,
      precipProb: 0,
      isDaylight: true
    });

    assert.equal(result.penalties.temperature >= 45, true);
    assert.equal(result.score <= 50, true);
  });

  test('Thunderstorm weather code triggers heavy penalty', () => {
    const result = calculateHourlyGreenWindowScore({
      aqi: 30,
      apparentTemp: 26,
      weatherCode: 95,
      precipProb: 80,
      isDaylight: true
    });

    assert.equal(result.penalties.precipitation, 55);
    assert.equal(result.reasonsEn.includes('Thunderstorm alert'), true);
  });

  test('Nighttime condition penalizes score for park exploration', () => {
    const result = calculateHourlyGreenWindowScore({
      aqi: 30,
      apparentTemp: 24,
      isDaylight: false
    });

    assert.equal(result.penalties.darkness, 25);
  });

  test('scoreForecastTimeline correctly identifies best window', () => {
    const mockHourly = {
      time: [
        '2026-10-07T06:00',
        '2026-10-07T12:00',
        '2026-10-07T17:00'
      ],
      us_aqi: [160, 180, 45],
      apparent_temperature: [26, 39, 27],
      uv_index: [0, 9, 1],
      precipitation_probability: [10, 0, 5],
      weather_code: [0, 0, 0]
    };

    const mockDaily = {
      sunrise: ['2026-10-07T05:50'],
      sunset: ['2026-10-07T17:35']
    };

    const result = scoreForecastTimeline(mockHourly, mockDaily);
    assert.equal(result.timeline.length, 3);
    assert.equal(result.bestWindow !== null, true);
    // Hour 17 should be the winner because AQI is 45 and it is golden hour
    assert.equal(result.bestWindow.hour, 17);
    assert.equal(result.bestWindow.score >= 80, true);
  });
});
