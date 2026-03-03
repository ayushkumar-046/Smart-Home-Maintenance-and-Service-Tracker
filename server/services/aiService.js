const OpenAI = require('openai');

function getClient() {
    if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'your_openai_key_here') {
        return null;
    }
    return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

// Smart category-based maintenance intervals (in days)
const maintenanceIntervals = {
    'Appliance Maintenance': { min: 90, max: 180, label: 'quarterly to semi-annual' },
    'Utility Services': { min: 180, max: 365, label: 'semi-annual to annual' },
    'Home Infrastructure Care': { min: 365, max: 730, label: 'annual to biennial' },
    'Home Security': { min: 180, max: 365, label: 'semi-annual' },
    'Cleaning Services': { min: 30, max: 90, label: 'monthly to quarterly' }
};

async function predictMaintenance(applianceData) {
    const client = getClient();
    if (!client) {
        const category = applianceData.category || 'Appliance Maintenance';
        const interval = maintenanceIntervals[category] || maintenanceIntervals['Appliance Maintenance'];
        const ageYears = applianceData.purchase_date
            ? (Date.now() - new Date(applianceData.purchase_date).getTime()) / (365.25 * 24 * 60 * 60 * 1000)
            : 2;

        const lastServiceDate = applianceData.service_history?.length > 0
            ? new Date(applianceData.service_history[applianceData.service_history.length - 1].date || Date.now())
            : new Date();

        const ageFactor = ageYears > 5 ? 0.7 : ageYears > 3 ? 0.85 : 1;
        const daysUntilNext = Math.round(interval.min * ageFactor);
        const nextDate = new Date(lastServiceDate.getTime() + daysUntilNext * 24 * 60 * 60 * 1000);
        const confidence = ageYears > 5 ? 'high' : ageYears > 3 ? 'medium' : 'low';

        const categoryRecommendations = {
            'Appliance Maintenance': `Your ${applianceData.name || 'appliance'} (${applianceData.brand || 'N/A'} ${applianceData.model || ''}) is ${ageYears.toFixed(1)} years old and in "${applianceData.lifecycle_stage || 'active'}" stage. Based on ${applianceData.service_history?.length || 0} previous service records and the typical ${interval.label} maintenance cycle, we predict the next service is needed by the date shown. ${ageYears > 4 ? 'As the appliance ages, we recommend increasing service frequency by 15-30% to prevent unexpected breakdowns.' : 'Continue following the manufacturer recommended maintenance schedule.'}`,
            'Utility Services': `Your ${applianceData.name || 'system'} requires ${interval.label} maintenance. ${ageYears > 3 ? 'Given its age of ' + ageYears.toFixed(1) + ' years, we recommend proactive inspections to catch potential issues early — especially checking for corrosion, sediment buildup, and seal deterioration.' : 'System is relatively new. Regular scheduled maintenance should keep it running efficiently.'}`,
            'Home Infrastructure Care': `Infrastructure components like your ${applianceData.name || 'system'} typically need ${interval.label} inspections. ${ageYears > 5 ? 'At ' + ageYears.toFixed(1) + ' years, weather exposure and wear may be causing gradual degradation. A thorough professional inspection is recommended.' : 'Regular visual inspections between professional service visits will help identify issues early.'}`,
            'Home Security': `Security systems require ${interval.label} checkups to ensure all cameras, sensors, and alarms function correctly. ${ageYears > 2 ? 'Firmware updates and battery replacements should be prioritized.' : 'System is new — ensure all components are properly calibrated.'}`,
            'Cleaning Services': `Deep cleaning services are recommended on a ${interval.label} basis. Regular maintenance cleaning helps preserve appliance efficiency and extends lifespan.`
        };

        return {
            predicted_date: nextDate.toISOString().split('T')[0],
            confidence,
            recommendation: categoryRecommendations[category] || categoryRecommendations['Appliance Maintenance'],
            risk_factors: ageYears > 4 ? ['Appliance aging', 'Increased failure probability', 'Higher repair costs expected'] : ['Normal wear and tear'],
            maintenance_priority: ageYears > 5 ? 'HIGH' : ageYears > 3 ? 'MEDIUM' : 'LOW',
            ai_powered: false
        };
    }

    const prompt = `You are a home maintenance expert AI. Given the following appliance data, predict the next likely breakdown or maintenance need. Use Indian Rupee for any cost estimates.

Appliance: ${applianceData.name}
Category: ${applianceData.category}
Brand: ${applianceData.brand}
Model: ${applianceData.model}
Purchase Date: ${applianceData.purchase_date}
Warranty Expiry: ${applianceData.warranty_expiry}
Lifecycle Stage: ${applianceData.lifecycle_stage}
Service History: ${JSON.stringify(applianceData.service_history)}

Respond in JSON format with:
{
  "predicted_date": "YYYY-MM-DD",
  "confidence": "high/medium/low",
  "recommendation": "detailed recommendation string",
  "risk_factors": ["factor1", "factor2"],
  "maintenance_priority": "HIGH/MEDIUM/LOW"
}`;

    const response = await client.chat.completions.create({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
        max_tokens: 600
    });

    const result = JSON.parse(response.choices[0].message.content);
    result.ai_powered = true;
    return result;
}

async function costForecast(data) {
    const client = getClient();
    if (!client) {
        const avgCost = data.past_costs.length > 0
            ? data.past_costs.reduce((a, b) => a + b, 0) / data.past_costs.length
            : 1500;

        const ageYears = data.age_years || 2;
        const inflationFactor = 1 + (ageYears * 0.05);

        const seasonalTips = {
            'Appliance Maintenance': 'AC servicing costs peak in summer (April-June). Book early for better rates.',
            'Utility Services': 'Plumbing issues are common during monsoon. Schedule preventive checks in March.',
            'Home Infrastructure Care': 'Painting and roofing is best done in winter (Oct-Feb) when costs are lower.',
            'Home Security': 'Security system upgrades often have festive season discounts.',
            'Cleaning Services': 'Pre-festival deep cleaning (Sep-Oct) has higher demand and prices.'
        };

        return {
            forecasts: [
                {
                    service: `Routine ${data.category || 'maintenance'} service`,
                    estimated_cost: Math.round(avgCost * inflationFactor),
                    timeframe: '3 months',
                    breakdown: { labor: Math.round(avgCost * 0.4), parts: Math.round(avgCost * 0.5), tax: Math.round(avgCost * 0.1) }
                },
                {
                    service: 'Comprehensive checkup with parts replacement',
                    estimated_cost: Math.round(avgCost * inflationFactor * 1.3),
                    timeframe: '6 months',
                    breakdown: { labor: Math.round(avgCost * 0.35 * 1.3), parts: Math.round(avgCost * 0.55 * 1.3), tax: Math.round(avgCost * 0.1 * 1.3) }
                },
                {
                    service: 'Major overhaul / preventive replacement',
                    estimated_cost: Math.round(avgCost * inflationFactor * 1.8),
                    timeframe: '12 months',
                    breakdown: { labor: Math.round(avgCost * 0.3 * 1.8), parts: Math.round(avgCost * 0.6 * 1.8), tax: Math.round(avgCost * 0.1 * 1.8) }
                }
            ],
            summary: `Based on ${data.past_costs.length} previous service records with an average cost of ₹${Math.round(avgCost)}, we project a ${Math.round(ageYears * 5)}% annual cost increase due to aging. ${ageYears > 5 ? 'Given the appliance age, expect higher repair frequency and cost. Budget ₹' + Math.round(avgCost * 3.5) + ' annually.' : 'Costs are relatively stable. Budget ₹' + Math.round(avgCost * 2.5) + ' annually for maintenance.'}`,
            seasonal_tip: seasonalTips[data.category] || 'Plan services during off-peak seasons for better pricing.',
            annual_budget: Math.round(avgCost * (ageYears > 5 ? 3.5 : 2.5)),
            ai_powered: false
        };
    }

    const prompt = `You are a home maintenance cost analyst. Based on the following data, forecast costs for the next 3 services. Use Indian Rupee for all estimates.

Appliance Category: ${data.category}
Appliance Age (years): ${data.age_years}
Past Service Costs: ${JSON.stringify(data.past_costs)}

Respond in JSON format with:
{
  "forecasts": [
    { "service": "description", "estimated_cost": number, "timeframe": "when", "breakdown": {"labor": number, "parts": number, "tax": number} }
  ],
  "summary": "brief analysis with amounts",
  "seasonal_tip": "best time to schedule",
  "annual_budget": number
}`;

    const response = await client.chat.completions.create({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
        max_tokens: 600
    });

    const result = JSON.parse(response.choices[0].message.content);
    result.ai_powered = true;
    return result;
}

async function detectAnomalies(serviceLogs) {
    const client = getClient();
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const recentLogs = serviceLogs.filter(log => new Date(log.scheduled_date) >= sixMonthsAgo);
    const breakdownCount = recentLogs.filter(l => l.status === 'completed').length;
    const totalCost = recentLogs.reduce((sum, l) => sum + (l.cost || 0), 0);
    const avgCostPerService = breakdownCount > 0 ? totalCost / breakdownCount : 0;

    if (!client) {
        const isAnomaly = breakdownCount > 3 || avgCostPerService > 3000;

        let explanation, recommendation;
        if (breakdownCount > 3 && avgCostPerService > 3000) {
            explanation = `⚠️ CRITICAL: This appliance has had ${breakdownCount} service events totaling ₹${Math.round(totalCost)} in the last 6 months (avg ₹${Math.round(avgCostPerService)} per service). Both frequency and cost are significantly above normal thresholds.`;
            recommendation = 'Strongly consider replacement. The repair costs are approaching or exceeding the value of a new appliance. Get quotes for replacement models.';
        } else if (breakdownCount > 3) {
            explanation = `⚠️ WARNING: This appliance has required ${breakdownCount} services in 6 months, which exceeds the normal threshold of 3. While individual costs are moderate (avg ₹${Math.round(avgCostPerService)}), the frequency indicates a recurring issue.`;
            recommendation = 'Schedule a comprehensive diagnostic inspection to identify the root cause. Frequent minor repairs often indicate a larger underlying problem.';
        } else if (avgCostPerService > 3000) {
            explanation = `📊 ATTENTION: While service frequency is normal (${breakdownCount} services), the average cost of ₹${Math.round(avgCostPerService)} per service is above the expected range. Total spend: ₹${Math.round(totalCost)} in 6 months.`;
            recommendation = 'Review if premium parts/services are necessary. Get comparative quotes from multiple vendors.';
        } else {
            explanation = `✅ NORMAL: This appliance has had ${breakdownCount} service events in the last 6 months with a total cost of ₹${Math.round(totalCost)}. All metrics are within normal operating ranges.`;
            recommendation = 'Continue regular scheduled maintenance. No anomalies detected.';
        }

        return {
            anomaly_detected: isAnomaly,
            breakdown_count: breakdownCount,
            period: '6 months',
            total_cost: Math.round(totalCost),
            avg_cost_per_service: Math.round(avgCostPerService),
            explanation,
            recommendation,
            severity: breakdownCount > 5 ? 'critical' : breakdownCount > 3 ? 'warning' : 'normal',
            metrics: {
                frequency_threshold: 3,
                cost_threshold: 3000,
                frequency_status: breakdownCount > 3 ? 'ABOVE' : 'NORMAL',
                cost_status: avgCostPerService > 3000 ? 'ABOVE' : 'NORMAL'
            },
            ai_powered: false
        };
    }

    const prompt = `You are a home appliance diagnostics AI. Analyze the following service logs for anomalies. Use Indian Rupee for costs.

Service Logs (last 6 months): ${JSON.stringify(recentLogs)}
Total breakdowns in 6 months: ${breakdownCount}
Total cost: ${Math.round(totalCost)}

Flag as anomaly if more than 3 breakdowns in 6 months OR average cost exceeds 3000 per service.

Respond in JSON format with:
{
  "anomaly_detected": boolean,
  "breakdown_count": number,
  "period": "6 months",
  "total_cost": number,
  "avg_cost_per_service": number,
  "explanation": "detailed explanation",
  "recommendation": "what to do",
  "severity": "critical/warning/normal"
}`;

    const response = await client.chat.completions.create({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
        max_tokens: 600
    });

    const result = JSON.parse(response.choices[0].message.content);
    result.ai_powered = true;
    return result;
}

async function recommendVendor(data) {
    const client = getClient();
    if (!client) {
        const sorted = [...data.vendors].sort((a, b) => {
            const scoreA = (a.rating * 0.5) + (Math.min(a.total_jobs, 300) / 300 * 0.3) + (a.category === data.category ? 0.2 : 0);
            const scoreB = (b.rating * 0.5) + (Math.min(b.total_jobs, 300) / 300 * 0.3) + (b.category === data.category ? 0.2 : 0);
            return scoreB - scoreA;
        });

        const categoryMatch = (vendor) => vendor.category === data.category;

        return {
            recommendations: sorted.slice(0, 3).map((v, i) => ({
                rank: i + 1,
                vendor_id: v.id,
                vendor_name: v.name,
                rating: v.rating,
                total_jobs: v.total_jobs,
                category_match: categoryMatch(v),
                estimated_response_time: v.total_jobs > 150 ? '1-2 hours' : v.total_jobs > 80 ? '2-4 hours' : '4-6 hours',
                reasoning: `${categoryMatch(v) ? '✅ Category specialist' : '📋 General service provider'} — Rated ${v.rating}/5 stars across ${v.total_jobs} completed jobs. ${v.rating >= 4.5 ? 'Consistently excellent reviews.' : v.rating >= 4.0 ? 'Reliable with good feedback.' : 'Adequate but room for improvement.'} ${v.total_jobs > 150 ? 'Highly experienced with fast response times.' : v.total_jobs > 80 ? 'Well-established with growing client base.' : 'Newer provider, may offer competitive pricing.'}`
            })),
            selection_criteria: {
                weights: { rating: '50%', experience: '30%', category_match: '20%' },
                total_vendors_evaluated: data.vendors.length
            },
            ai_powered: false
        };
    }

    const prompt = `You are a vendor recommendation AI for home maintenance. Based on the appliance category and vendor list, recommend the top 3 vendors.

Appliance Category: ${data.category}
Available Vendors: ${JSON.stringify(data.vendors)}

Respond in JSON format with:
{
  "recommendations": [
    {
      "rank": 1,
      "vendor_id": number,
      "vendor_name": "name",
      "rating": number,
      "total_jobs": number,
      "category_match": boolean,
      "estimated_response_time": "time",
      "reasoning": "why this vendor is recommended"
    }
  ],
  "selection_criteria": {"weights": {"rating": "50%", "experience": "30%", "category_match": "20%"}, "total_vendors_evaluated": number}
}`;

    const response = await client.chat.completions.create({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
        max_tokens: 600
    });

    const result = JSON.parse(response.choices[0].message.content);
    result.ai_powered = true;
    return result;
}

async function optimizeLifespan(data) {
    const client = getClient();
    if (!client) {
        const ageYears = data.age_years || 0;
        const tips = [];
        const categoryTips = {
            'Appliance Maintenance': {
                new: [
                    'Register your product warranty online for instant claim processing.',
                    'Clean filters every 2 weeks for AC units to maintain efficiency.',
                    'Use voltage stabilizers to protect from power surges — saves up to 15% on repair costs.',
                    'Run self-cleaning cycles monthly if available on your appliance.',
                    'Keep the user manual accessible — it contains model-specific maintenance schedules.'
                ],
                mid: [
                    'Increase filter cleaning frequency to weekly during peak usage months.',
                    'Schedule professional servicing every 4-6 months instead of annually.',
                    'Replace rubber seals and gaskets proactively — they degrade after 3-4 years.',
                    'Monitor energy bills for unusual spikes — could indicate declining efficiency.',
                    'Consider an AMC (Annual Maintenance Contract) for cost savings on regular servicing.',
                    'Check refrigerant levels in AC units — low refrigerant causes compressor strain.'
                ],
                old: [
                    'Compare repair costs with new appliance costs before each major repair.',
                    'An appliance using 30%+ more energy than when new should be replaced.',
                    'Focus on safety: check electrical connections, wiring, and grounding.',
                    'Start researching energy-efficient replacement models with better star ratings.',
                    'Budget ₹5,000-₹15,000 annually for aging appliance repairs.',
                    'Consider trade-in offers from major brands for discounts on new purchases.'
                ]
            },
            'Utility Services': {
                new: ['Ensure proper installation was done by certified professionals.', 'Test all safety valves and pressure relief mechanisms.', 'Install water softeners if your area has hard water.', 'Document all installation details and serial numbers.'],
                mid: ['Flush water heaters annually to remove sediment.', 'Check pipe joints and connections for early signs of leaks.', 'Test water quality quarterly if using purifiers.', 'Inspect electrical connections in utility systems semi-annually.', 'Replace sacrificial anode rods in water heaters every 3-4 years.'],
                old: ['Replace aging pipes and connections before they fail.', 'Upgrade to modern, energy-efficient utility systems.', 'Install leak detectors near aging plumbing connections.', 'Budget for complete system overhaul within 2-3 years.', 'Consider water-saving fixtures to reduce strain on aging systems.']
            },
            'Home Infrastructure Care': {
                new: ['Apply protective coatings within the first year for maximum protection.', 'Document baseline conditions with photos for future comparison.', 'Ensure proper ventilation and drainage around foundation.'],
                mid: ['Inspect for cracks, weathering, and water damage annually.', 'Reapply sealants and protective coatings every 3-5 years.', 'Trim vegetation away from walls and roof edges.', 'Clean gutters and downspouts twice yearly.'],
                old: ['Get professional structural assessment every 2 years.', 'Budget for major renovation or replacement planning.', 'Address any water intrusion issues immediately.', 'Consider energy-efficient upgrades during renovation.']
            }
        };

        const catTips = categoryTips[data.category] || categoryTips['Appliance Maintenance'];
        if (ageYears < 3) {
            tips.push(...catTips.new);
        } else if (ageYears < 7) {
            tips.push(...catTips.mid);
        } else {
            tips.push(...catTips.old);
        }

        const lifespanEstimates = {
            'Appliance Maintenance': 12,
            'Utility Services': 15,
            'Home Infrastructure Care': 25,
            'Home Security': 8,
            'Cleaning Services': 10
        };
        const expectedLifespan = lifespanEstimates[data.category] || 12;
        const remainingYears = Math.max(0, expectedLifespan - ageYears);

        return {
            tips,
            replacement_recommendation: ageYears > expectedLifespan
                ? `🔴 URGENT: This ${data.name || 'appliance'} has exceeded its expected lifespan of ${expectedLifespan} years. Immediate replacement is recommended for safety and efficiency.`
                : ageYears > expectedLifespan * 0.7
                    ? `🟡 PLANNING: At ${ageYears.toFixed(1)} years old, this ${data.name || 'appliance'} is in its final phase (expected lifespan: ${expectedLifespan} years). Start researching replacements.`
                    : `🟢 GOOD: At ${ageYears.toFixed(1)} years old, this ${data.name || 'appliance'} has approximately ${remainingYears.toFixed(0)} years of useful life remaining. Continue regular maintenance to maximize longevity.`,
            estimated_remaining_life: remainingYears.toFixed(0) + ' years',
            health_score: Math.max(10, Math.round(100 - (ageYears / expectedLifespan * 100))) + '/100',
            expected_lifespan: expectedLifespan + ' years',
            efficiency_estimate: ageYears < 3 ? '95-100%' : ageYears < 7 ? '75-90%' : ageYears < 10 ? '50-75%' : '30-50%',
            ai_powered: false
        };
    }

    const prompt = `You are a home appliance lifespan optimization AI. Based on the following data, provide tips to extend the appliance's lifespan and a replacement recommendation. Use Indian Rupee for costs.

Appliance: ${data.name}
Category: ${data.category}
Age (years): ${data.age_years}
Lifecycle Stage: ${data.lifecycle_stage}
Service History: ${JSON.stringify(data.service_history)}

Respond in JSON format with:
{
  "tips": ["tip1", "tip2", "tip3", "tip4", "tip5"],
  "replacement_recommendation": "detailed recommendation",
  "estimated_remaining_life": "X years",
  "health_score": "XX/100",
  "expected_lifespan": "X years",
  "efficiency_estimate": "XX%"
}`;

    const response = await client.chat.completions.create({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
        max_tokens: 600
    });

    const result = JSON.parse(response.choices[0].message.content);
    result.ai_powered = true;
    return result;
}

module.exports = {
    predictMaintenance,
    costForecast,
    detectAnomalies,
    recommendVendor,
    optimizeLifespan
};
