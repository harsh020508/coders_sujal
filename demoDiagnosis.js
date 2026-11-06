// Single shared demo fallback for AI Photo Diagnosis, used by the Node
// server (server.js), the Vercel function (api/analyze-photo.js), and the
// browser fallback (photoDiagnosis.js) so all three return the same
// estimates instead of drifting copies. Flagged with demo: true so the
// UI can label it as a demo estimate, never as a verified AI result.
export function getDemoAiResult(note) {
  const n = (note || '').toLowerCase();
  if (n.includes('electric') || n.includes('wire') || n.includes('spark') || n.includes('switch')) {
    return { demo: true, problem_found: true, issue: 'Faulty electrical switchboard with exposed wiring', service_category: 'electrician', urgency: 'emergency', price_min: 800, price_max: 2500, likely_materials: ['MCB breaker', 'Electrical tape', 'Wire connectors'], estimated_duration_minutes: 45, safety_warning: 'Do NOT touch exposed wires. Turn off the main breaker immediately.', confidence: 'high', follow_up_question: null };
  }
  if (n.includes('paint') || n.includes('damp') || n.includes('wall') || n.includes('peel')) {
    return { demo: true, problem_found: true, issue: 'Damp wall with paint peeling and possible seepage', service_category: 'painter', urgency: 'medium', price_min: 1500, price_max: 5000, likely_materials: ['Primer', 'Waterproof putty', 'Emulsion paint'], estimated_duration_minutes: 180, safety_warning: null, confidence: 'high', follow_up_question: null };
  }
  if (n.includes('carpenter') || n.includes('wood') || n.includes('door') || n.includes('furniture')) {
    return { demo: true, problem_found: true, issue: 'Damaged wooden door hinge and frame repair needed', service_category: 'carpenter', urgency: 'low', price_min: 500, price_max: 2000, likely_materials: ['Door hinges', 'Wood screws', 'Wood filler'], estimated_duration_minutes: 60, safety_warning: null, confidence: 'high', follow_up_question: null };
  }
  // Default: leaking tap / plumber
  return { demo: true, problem_found: true, issue: 'Leaking kitchen tap with worn-out washer', service_category: 'plumber', urgency: 'medium', price_min: 300, price_max: 800, likely_materials: ['Tap washer', 'Teflon tape', 'Adjustable wrench'], estimated_duration_minutes: 30, safety_warning: null, confidence: 'high', follow_up_question: null };
}
