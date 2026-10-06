/**
 * Prompt builder for Gemma Open-Weight Model
 * Adheres to verified constraints: places system rules inside user turn and enforces strict JSON schema.
 */

export function buildGreenWindowPrompt({
  minutes = 30,
  goal = 'calm',
  language = 'en',
  weatherSummary,
  bestWindow,
  greenSpaces = [],
  guardrails
}) {
  const isBn = language === 'bn';
  const placesFormatted = greenSpaces
    .slice(0, 5)
    .map(
      (p, i) =>
        `${i + 1}. [ID: ${p.id}] ${p.name} (${p.distanceMeters}m away, ~${p.walkTimeMinutes} min walk)`
    )
    .join('\n');

  const guardrailRules = [];
  if (guardrails.flags.hazardousAqi) {
    guardrailRules.push(
      '- MANDATORY: AQI > 200 (Hazardous). DO NOT suggest strenuous walking. Recommend rest, postponing, or indoor/balcony nature observation with N95 mask.'
    );
  } else if (guardrails.flags.unhealthyAqi) {
    guardrailRules.push(
      '- MANDATORY: AQI > 150 (Unhealthy). Effort level MUST be "gentle". No brisk jogging or heavy cardio.'
    );
  }
  if (guardrails.flags.extremeHeat) {
    guardrailRules.push(
      '- MANDATORY: Extreme heat index >= 38°C. Recommend seeking deep tree shade, avoiding midday sun, and staying hydrated.'
    );
  }
  if (guardrails.flags.rainThunder) {
    guardrailRules.push(
      '- MANDATORY: Thunderstorm/rain alert. Advise rescheduling or seeking covered pavilion/porch.'
    );
  }
  if (guardrails.flags.mosquitoRisk) {
    guardrailRules.push(
      '- MANDATORY: High mosquito/vector risk (warm, humid, post-rain). Add an explicit reminder to apply insect repellent.'
    );
  }

  const promptText = `
[ROLE & PURPOSE]
You are "Sobuj Ghonta (সবুজ ঘণ্টা) — The Green Hour", an ambient, mindful outdoor companion designed to get urban dwellers off their screens and into real nature safely.

[USER REQUEST]
- Time available: ${minutes} minutes
- Walk Goal: ${goal} (Options: calm / light exercise / birding / kids / elders)
- Language: ${isBn ? 'Bengali (বাংলা)' : 'English'}

[REAL ENVIRONMENTAL CONDITIONS]
- Location Air Quality (US AQI): ${weatherSummary.aqi} (${weatherSummary.aqi > 150 ? 'Unhealthy' : weatherSummary.aqi > 100 ? 'Moderate' : 'Good'})
- Apparent Temperature: ${weatherSummary.apparentTemp}°C (Feels like)
- UV Index: ${weatherSummary.uv}
- Precipitation Probability: ${weatherSummary.precipProb}%
- Optimal Green Window: ${bestWindow?.start || 'Now'} to ${bestWindow?.end || 'Next Hour'} (Score: ${bestWindow?.score || 80}/100)

[CANDIDATE GREEN SPACES (TOP 5)]
${placesFormatted || '1. [ID: default_park] Local Community Park'}

[IMMUTABLE SAFETY GUARDRAILS (YOU CANNOT OVERRIDE THESE)]
${guardrailRules.length > 0 ? guardrailRules.join('\n') : '- Environmental conditions are favorable for outdoor walk.'}
- Effort level MUST be one of: "${guardrails.maxAllowedEffort === 'rest' ? 'rest' : guardrails.maxAllowedEffort === 'gentle' ? 'gentle' : 'moderate'}"

[OUTPUT RULES]
1. Return ONLY a single raw JSON object matching the exact schema below.
2. Do NOT wrap in markdown codeblocks (no \`\`\`json). Do NOT add conversational preamble or sign-off.
3. The walk_script MUST contain 4 to 6 sequential segments.
4. Each walk_script segment text MUST be under 60 words, tailored to spoken audio pacing (contemplative, sensory, observant).
5. The script MUST mention the selected green space name and real sensory details of that location (trees, lake, shade, breeze), never generic filler.
6. The missions array MUST contain exactly 3 items with types from: "look", "listen", "touch", "smell".
${isBn ? '7. Write ALL strings in natural, poetic, clear Bengali (বাংলা).' : '7. Write in natural, grounded, calm English.'}

[REQUIRED JSON SCHEMA]
{
  "headline": "Short title (under 8 words)",
  "window": {
    "start": "16:30",
    "end": "17:30",
    "why": "Brief explanation of why this window is best"
  },
  "destination_id": "exact_id_from_candidate_list",
  "destination_name": "Name of destination",
  "effort_level": "${guardrails.maxAllowedEffort}",
  "health_notes": [
    "Concrete observation about air/heat/mosquitoes",
    "Hydration or shade note"
  ],
  "missions": [
    {"type": "look", "prompt": "Specific visual cue to seek outside"},
    {"type": "listen", "prompt": "Specific sound cue to listen for"},
    {"type": "touch", "prompt": "Specific tactile texture to touch"}
  ],
  "walk_script": [
    {"title": "Step 1 title", "text": "Calm spoken text under 60 words for audio narration."},
    {"title": "Step 2 title", "text": "Calm spoken text under 60 words."},
    {"title": "Step 3 title", "text": "Calm spoken text under 60 words."},
    {"title": "Step 4 title", "text": "Calm spoken text under 60 words."}
  ]
}
`;

  return promptText.trim();
}
