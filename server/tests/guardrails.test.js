import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  evaluateSafetyGuardrails,
  validateAndCorrectPlan,
  MEDICAL_DISCLAIMER_EN,
  MEDICAL_DISCLAIMER_BN
} from '../services/guardrails.js';

describe('Safety Guardrails Engine', () => {
  test('AQI > 150 overrides strenuous effort to gentle and warns about air quality', () => {
    const guardrails = evaluateSafetyGuardrails({ aqi: 165, apparentTemp: 28 });
    assert.equal(guardrails.flags.unhealthyAqi, true);
    assert.equal(guardrails.maxAllowedEffort, 'gentle');

    const unsafePlan = {
      effort_level: 'strenuous',
      health_notes: ['Drink water'],
      missions: [{ type: 'look', prompt: 'Find birds' }],
      walk_script: [{ title: 'Jog', text: 'Sprint as fast as you can around the track.' }]
    };

    const corrected = validateAndCorrectPlan(unsafePlan, guardrails, 'en');
    assert.equal(corrected.effort_level, 'gentle');
    assert.equal(corrected.health_notes.some(n => n.includes('Poor air quality')), true);
    assert.equal(corrected.health_notes.includes(MEDICAL_DISCLAIMER_EN), true);
  });

  test('AQI > 200 mandates rest/postpone and N95 mask guidance', () => {
    const guardrails = evaluateSafetyGuardrails({ aqi: 240, apparentTemp: 25 });
    assert.equal(guardrails.flags.hazardousAqi, true);
    assert.equal(guardrails.maxAllowedEffort, 'rest');

    const rawPlan = { effort_level: 'moderate', health_notes: [] };
    const corrected = validateAndCorrectPlan(rawPlan, guardrails, 'en');

    assert.equal(corrected.effort_level, 'rest');
    assert.equal(corrected.health_notes.some(n => n.includes('N95 mask')), true);
  });

  test('Bangla translations are used when requested language is bn', () => {
    const guardrails = evaluateSafetyGuardrails({ aqi: 210, apparentTemp: 39 });
    const corrected = validateAndCorrectPlan({}, guardrails, 'bn');

    assert.equal(corrected.health_notes.includes(MEDICAL_DISCLAIMER_BN), true);
    assert.equal(corrected.health_notes.some(n => n.includes('N95 মাস্ক')), true);
  });

  test('Warm, humid, rainy conditions trigger mosquito alert', () => {
    const guardrails = evaluateSafetyGuardrails({
      apparentTemp: 29,
      humidity: 80,
      precipProb: 45
    });

    assert.equal(guardrails.flags.mosquitoRisk, true);
    const corrected = validateAndCorrectPlan({}, guardrails, 'en');
    assert.equal(corrected.health_notes.some(n => n.includes('insect repellent')), true);
  });

  test('Overly verbose walk script segments are trimmed to <=60 words', () => {
    const guardrails = evaluateSafetyGuardrails({ aqi: 30 });
    const longText = new Array(80).fill('nature').join(' ');
    const plan = {
      walk_script: [
        { title: 'Intro', text: longText }
      ]
    };

    const corrected = validateAndCorrectPlan(plan, guardrails, 'en');
    const words = corrected.walk_script[0].text.split(/\s+/);
    assert.equal(words.length <= 62, true);
  });

  test('Apparent temp >= 38°C triggers extreme heat avoidance guardrail', () => {
    const guardrails = evaluateSafetyGuardrails({ apparentTemp: 39.5, hour: 13 });
    assert.equal(guardrails.flags.extremeHeat, true);
    assert.equal(guardrails.flags.middaySun, true);

    const corrected = validateAndCorrectPlan({}, guardrails, 'en');
    assert.equal(corrected.health_notes.some(n => n.includes('Extreme thermal stress')), true);
    assert.equal(corrected.health_notes.some(n => n.includes('avoid midday sun')), true);
  });

  test('Thunderstorm weather codes (95, 96, 99) trigger severe weather warning', () => {
    for (const code of [95, 96, 99]) {
      const guardrails = evaluateSafetyGuardrails({ weatherCode: code });
      assert.equal(guardrails.flags.rainThunder, true);
      const corrected = validateAndCorrectPlan({}, guardrails, 'en');
      assert.equal(corrected.health_notes.some(n => n.includes('Thunderstorm/heavy rain warning')), true);
    }
  });
});
