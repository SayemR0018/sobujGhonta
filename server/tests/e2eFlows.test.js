import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { evaluateSafetyGuardrails, validateAndCorrectPlan } from '../services/guardrails.js';
import { computeAudioHash } from '../services/tts/elevenlabs.js';
import { DHAKA_SAMPLE_WEATHER, DHAKA_PARKS, DHAKA_PREGENERATED_PLAN_BN, DHAKA_PREGENERATED_PLAN_EN } from '../services/demoData.js';
import { haversineDistanceMeters, walkingTimeMinutes } from '../services/places.js';

describe('End-to-End Edge Case & Flow Tests', () => {
  test('AQI > 200 scenario forces rest effort and N95 mask guidance', () => {
    const hazardousCondition = { aqi: 245, apparentTemp: 29 };
    const guardrails = evaluateSafetyGuardrails(hazardousCondition);

    assert.equal(guardrails.flags.hazardousAqi, true);
    assert.equal(guardrails.maxAllowedEffort, 'rest');

    const rawGemmaPlan = {
      headline: 'Quick Jog around Lake',
      effort_level: 'moderate',
      destination_id: 'dhanmondi_lake',
      health_notes: ['Keep moving!'],
      missions: [{ type: 'look', prompt: 'Look at waves' }],
      walk_script: [{ title: 'Start', text: 'Run around the perimeter track.' }]
    };

    const corrected = validateAndCorrectPlan(rawGemmaPlan, guardrails, 'en');
    assert.equal(corrected.effort_level, 'rest');
    assert.equal(corrected.health_notes.some(n => n.includes('N95 mask')), true);
    assert.equal(corrected.health_notes.some(n => n.includes('Outdoor exercise is unsafe')), true);
  });

  test('Bangla translations retain correct Unicode script integrity', () => {
    const guardrails = evaluateSafetyGuardrails({ aqi: 180, apparentTemp: 32 });
    const bnPlan = validateAndCorrectPlan(DHAKA_PREGENERATED_PLAN_BN, guardrails, 'bn');

    assert.equal(typeof bnPlan.headline, 'string');
    assert.equal(bnPlan.headline.includes('রমনা'), true);
    assert.equal(bnPlan.health_notes.some(n => n.includes('সতর্কতা: সবুজ ঘণ্টা')), true);
    assert.equal(bnPlan.walk_script.length >= 4, true);
  });

  test('Audio hash caching is deterministic for duplicate text segments', () => {
    const text = 'Stow your phone in your pocket. Take a deep breath.';
    const voiceId = '21m00Tcm4TlvDq8ikWAM';
    const lang = 'en';
    const model = 'eleven_multilingual_v2';

    const hash1 = computeAudioHash(text, voiceId, lang, model);
    const hash2 = computeAudioHash(text, voiceId, lang, model);
    const hashDifferentText = computeAudioHash(text + ' extra words', voiceId, lang, model);

    assert.equal(hash1, hash2);
    assert.notEqual(hash1, hashDifferentText);
    assert.equal(hash1.length, 64); // sha256 hex
  });

  test('Haversine distance accurately measures known coordinates in Dhaka', () => {
    // Ramna Park to Suhrawardy Udyan (approx 600m - 900m)
    const ramna = { lat: 23.7388, lon: 90.3995 };
    const suhrawardy = { lat: 23.7335, lon: 90.3975 };

    const distance = haversineDistanceMeters(ramna.lat, ramna.lon, suhrawardy.lat, suhrawardy.lon);
    assert.equal(distance >= 550 && distance <= 750, true, `Calculated distance: ${distance}m`);

    const walkMins = walkingTimeMinutes(distance);
    assert.equal(walkMins >= 7 && walkMins <= 11, true, `Calculated walk time: ${walkMins}m`);
  });

  test('Bundled Dhaka fallback data is fully populated and consistent', () => {
    assert.equal(DHAKA_PARKS.length, 5);
    assert.equal(DHAKA_SAMPLE_WEATHER.hourly.time.length, 24);
    assert.equal(DHAKA_SAMPLE_WEATHER.hourly.us_aqi.length, 24);
    assert.equal(DHAKA_PREGENERATED_PLAN_EN.walk_script.length, 4);
    assert.equal(DHAKA_PREGENERATED_PLAN_BN.walk_script.length, 4);
  });
});
