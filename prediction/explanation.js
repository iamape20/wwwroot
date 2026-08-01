'use strict';

module.exports = function buildExplanation(prediction) {

    const lines = [];

    lines.push(`Horse: ${prediction.horse}`);
    lines.push(`Rating: ${prediction.rating}/10`);

    if (prediction.confidence !== undefined) {
        lines.push(`Confidence: ${prediction.confidence}%`);
    }

    lines.push('');

    for (const [name, analysis] of Object.entries(prediction.analyses)) {

        lines.push(name.toUpperCase());
        lines.push(`Score: ${analysis.score}`);

        if (analysis.reasons?.length) {

            lines.push('Reasons:');

            for (const reason of analysis.reasons) {
                lines.push(`  ✓ ${reason}`);
            }
        }

        if (analysis.risks?.length) {

            lines.push('Risks:');

            for (const risk of analysis.risks) {
                lines.push(`  • ${risk}`);
            }
        }

        lines.push('');
    }

    return lines.join('\n');
};